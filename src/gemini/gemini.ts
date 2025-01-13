import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import {
  fullTranslateFilePrompt,
  partialTranslateFilePrompt,
  translateLabelsPrompt,
} from "./prompts";
import * as Sentry from "@sentry/node";

export class Gemini {
  private model: GenerativeModel;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("No value found in .env file for GEMINI_API_KEY");
    }

    this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: "gemini-1.5-pro",
    });
  }

  async translateFull(
    content: string,
    targetLanguage: string,
    encoding: "utf8" | "base64" = "base64"
  ): Promise<string> {
    const lines = content.split("\n");
    const chunkSize = 200;
    let translatedContent = "";
    let context = "";

    if (lines.length > chunkSize) {
      Sentry.captureMessage(
        "Ouf, this is a big file to translate, hopefully it's going to work!",
        {
          level: "warning",
          extra: {
            numbeOfLines: lines.length,
            targetLanguage,
          },
        }
      );
    }

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join("\n");
      const prompt = fullTranslateFilePrompt(chunk, targetLanguage, context);
      const generatedContent = await this.model.generateContent(prompt);
      const chunkTranslation = generatedContent.response.text();

      const cleanChunkTranslation = chunkTranslation
        .replace(/^```.*\n/, "") // Remove opening code fence
        .replace(/\n```$/, ""); // Remove closing code fence

      translatedContent += (i > 0 ? "\n" : "") + cleanChunkTranslation;
      context = cleanChunkTranslation; // Use the previous translation as context for the next chunk
    }

    return Buffer.from(translatedContent).toString(encoding);
  }

  async translatePartial(
    translationFileContent: string,
    changesToBaseTranslation: string,
    targetLanguage: string,
    encoding: "utf8" | "base64" = "base64"
  ): Promise<string> {
    const translationFileLines = translationFileContent.split("\n");
    const chunkSize = 200;
    let translatedContent = "";
    let context = "";

    if (translationFileLines.length > chunkSize) {
      Sentry.captureMessage(
        "Large file detected for partial translation, processing in chunks",
        {
          level: "warning",
          extra: {
            numberOfLines: translationFileLines.length,
            targetLanguage,
          },
        }
      );
    }

    for (let i = 0; i < translationFileLines.length; i += chunkSize) {
      const chunkLines = translationFileLines.slice(i, i + chunkSize);
      const chunkWithLineNumbers = chunkLines
        .map((line, index) => `${i + index + 1}: ${line}`)
        .join("\n");

      const prompt = partialTranslateFilePrompt(
        chunkWithLineNumbers,
        targetLanguage,
        changesToBaseTranslation,
        context
      );

      const generatedContent = await this.model.generateContent(prompt);
      const chunkResponse = generatedContent.response.text();

      const cleanChunkResponse = chunkResponse
        .replace(/^```.*\n/, "") // Remove opening code fence
        .replace(/\n```$/, ""); // Remove closing code fence

      translatedContent += (i > 0 ? "\n" : "") + cleanChunkResponse;
      context = cleanChunkResponse; // Use the previous translation as context for the next chunk
    }

    return Buffer.from(translatedContent).toString(encoding);
  }

  async translateLabels(
    labels: string,
    targetLanguage: string
  ): Promise<string> {
    const prompt = translateLabelsPrompt(labels, targetLanguage);
    const generatedContent = await this.model.generateContent(prompt);
    const response = generatedContent.response.text();
    return response;
  }

  async translateFullFromJson<T>(
    jsonObj: T,
    targetLanguage: string
  ): Promise<T> {
    // Flatten the object into a map of key-value pairs
    const flattenedMap = this.flattenObject(jsonObj);
    const entries = Array.from(flattenedMap.entries());
    const chunkSize = 200;
    const translatedMap = new Map<string, string>();

    // Process in chunks of 200 values
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const valuesToTranslate = chunk.map(([_, value]) => value).join("\n");

      const translatedContent = await this.translateLabels(
        valuesToTranslate,
        targetLanguage
      );
      const translatedValues = translatedContent.split("\n");

      // Map translated values back to their keys
      chunk.forEach(([key], index) => {
        translatedMap.set(key, translatedValues[index]);
      });
    }

    // Reconstruct the object with translated values
    return this.unflattenObject(translatedMap) as T;
  }

  async translatePartialFromJson<T>({
    baseJsonObj,
    previousBaseJsonObj,
    targetLanguageFileObj,
    targetLanguage,
  }: {
    baseJsonObj: T;
    previousBaseJsonObj: T;
    targetLanguageFileObj: T;
    targetLanguage: string;
  }): Promise<T> {
    // Flatten all objects into maps
    const baseFlatMap = this.flattenObject(baseJsonObj);
    const previousBaseFlatMap = this.flattenObject(previousBaseJsonObj);
    const targetFlatMap = this.flattenObject(targetLanguageFileObj);

    // Identify keys that need translation (changed or new values)
    const keysToTranslate = new Map<string, string>();

    // Check all keys in the base object
    baseFlatMap.forEach((value, key) => {
      const previousValue = previousBaseFlatMap.get(key);

      // Case 1: New key or changed value
      if (!previousValue || previousValue !== value) {
        keysToTranslate.set(key, value);
      }
    });

    // If there are no changes needed, return the original target content
    if (keysToTranslate.size === 0) {
      return targetLanguageFileObj;
    }

    // Translate changed/new values in chunks
    const entries = Array.from(keysToTranslate.entries());
    const chunkSize = 200;
    const translatedMap = new Map<string, string>();

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const valuesToTranslate = chunk.map(([_, value]) => value).join("\n");

      const translatedContent = await this.translateLabels(
        valuesToTranslate,
        targetLanguage
      );
      const translatedValues = translatedContent.split("\n");

      // Map translated values back to their keys
      chunk.forEach(([key], index) => {
        translatedMap.set(key, translatedValues[index]);
      });
    }

    // Create the final merged map:
    // 1. Start with existing target language translations
    const mergedMap = new Map(targetFlatMap);

    // 2. Remove keys that were removed in base
    targetFlatMap.forEach((_, key) => {
      if (!baseFlatMap.has(key)) {
        mergedMap.delete(key);
      }
    });

    // 3. Add new translations
    translatedMap.forEach((value, key) => {
      mergedMap.set(key, value);
    });

    // Reconstruct the object with merged translations
    return this.unflattenObject(mergedMap) as T;
  }

  /**
   * AI generated code to flatten a nested object into flattened key-value pairs
   */
  private flattenObject(obj: any, prefix = ""): Map<string, string> {
    const flattened = new Map<string, string>();

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === "object" && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === "string") {
                flattened.set(`${newKey}[${index}]`, item);
              } else if (typeof item === "object" && item !== null) {
                const nested = this.flattenObject(item, `${newKey}[${index}]`);
                nested.forEach((val, key) => flattened.set(key, val));
              }
            });
          } else {
            const nested = this.flattenObject(value, newKey);
            nested.forEach((val, key) => flattened.set(key, val));
          }
        } else if (typeof value === "string") {
          flattened.set(newKey, value);
        }
      }
    }

    return flattened;
  }

  /**
   * AI generated code to reconstruct an object from a flattened map of key-value pairs
   */
  private unflattenObject(flatMap: Map<string, string>): any {
    const result: any = {};

    flatMap.forEach((value, key) => {
      const parts = key.split(/\.|\[|\]/).filter(Boolean);
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPart = parts[i + 1];
        const isNextPartArrayIndex = !isNaN(Number(nextPart));

        if (!(part in current)) {
          current[part] = isNextPartArrayIndex ? [] : {};
        }
        current = current[part];
      }

      const lastPart = parts[parts.length - 1];
      if (Array.isArray(current)) {
        current[Number(lastPart)] = value;
      } else {
        current[lastPart] = value;
      }
    });

    return result;
  }
}
