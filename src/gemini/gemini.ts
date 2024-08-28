import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { translateFilePrompt } from "./prompts";

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

  async translateFile(
    content: string,
    targetLanguage: string
  ): Promise<string> {
    const prompt = translateFilePrompt(content, targetLanguage);

    const generatedContent = await this.model.generateContent(prompt);
    return generatedContent.response.text();
  }
}
