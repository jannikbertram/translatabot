import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { fullTranslateFilePrompt, partialTranslateFilePrompt } from "./prompts";
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
}
