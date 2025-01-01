import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { fullTranslateFilePrompt, partialTranslateFilePrompt } from "./prompts";

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
    const prompt = fullTranslateFilePrompt(content, targetLanguage);

    const generatedContent = await this.model.generateContent(prompt);
    return Buffer.from(generatedContent.response.text()).toString(encoding);
  }

  async translatePartial(
    translationFileContent: string,
    changesToBaseTranslation: string,
    targetLanguage: string,
    encoding: "utf8" | "base64" = "base64"
  ): Promise<string> {
    const translationFileLines = translationFileContent.split("\n");
    const translationFileWithLineNumber = translationFileLines
      .map((line, index) => `${index + 1}: ${line}`)
      .join("\n");

    const prompt = partialTranslateFilePrompt(
      translationFileWithLineNumber,
      targetLanguage,
      changesToBaseTranslation
    );

    const generatedContent = await this.model.generateContent(prompt);
    const response = generatedContent.response.text();

    const cleanResponse = response
      .replace(/^```json\n/, "")
      .replace(/\n```$/, "");

    return Buffer.from(cleanResponse).toString(encoding);
  }
}
