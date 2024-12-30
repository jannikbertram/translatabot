import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { fullTranslateFilePrompt, partialTranslateFilePrompt } from "./prompts";

type FileChange = {
  line: number;
  action: "add" | "remove" | "replace";
  content?: string;
};

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

    const responseLines = response.split("\n");
    const fileUpdates = JSON.parse(
      responseLines.slice(1, -1).join("\n")
    ) as FileChange[];

    return Buffer.from(
      this.applyChangesToFile(translationFileLines, fileUpdates).join("\n")
    ).toString(encoding);
  }

  /*
   * ChatGPT generated
   */
  private applyChangesToFile = (
    lines: string[],
    changes: FileChange[]
  ): string[] => {
    // Sort changes by line number to ensure they're applied in the correct order
    const sortedChanges = [...changes].sort((a, b) => a.line - b.line);
    let modifiedLines = [...lines];

    // Apply removes first
    sortedChanges
      .filter((change) => change.action === "remove")
      .forEach((change) => {
        const index = change.line - 1;
        if (index >= 0 && index < modifiedLines.length) {
          modifiedLines.splice(index, 1);
        }
      });

    // Then apply replaces
    sortedChanges
      .filter((change) => change.action === "replace")
      .forEach((change) => {
        const index = change.line - 1;
        if (index >= 0 && index < modifiedLines.length && change.content) {
          modifiedLines[index] = change.content;
        }
      });

    // Finally apply adds
    sortedChanges
      .filter((change) => change.action === "add")
      .forEach((change) => {
        const index = change.line - 1;
        if (change.content) {
          modifiedLines.splice(index, 0, change.content);
        }
      });

    return modifiedLines;
  };
}
