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
    targetLanguage: string
  ): Promise<string> {
    const prompt = fullTranslateFilePrompt(content, targetLanguage);

    const generatedContent = await this.model.generateContent(prompt);
    return generatedContent.response.text();
  }

  async translatePartial(
    translationFileContent: string,
    changesToBaseTranslation: string,
    targetLanguage: string
  ): Promise<string> {
    const translationFileLines = translationFileContent.split("\n");
    const translationFileWithLineNumber = translationFileLines
      .map((line, index) => `${index + 1}#${line}`)
      .join("\n");

    const prompt = partialTranslateFilePrompt(
      translationFileWithLineNumber,
      targetLanguage,
      changesToBaseTranslation
    );

    const generatedContent = await this.model.generateContent(prompt);
    const fileUpdates = JSON.parse(
      generatedContent.response.text()
    ) as FileChange[];

    return this.applyChangesToFile(translationFileLines, fileUpdates).join(
      "\n"
    );
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

    // Create a copy of the lines to apply changes to
    let modifiedLines = [...lines];

    // Track offset due to adding or removing lines
    let offset = 0;

    sortedChanges.forEach((change) => {
      const index = change.line - 1 + offset; // Convert 1-based line number to 0-based index

      if (change.action === "add" && change.content !== undefined) {
        // Insert the new content at the specified index
        modifiedLines.splice(index, 0, change.content);
        offset += 1; // Increase offset because a line was added
      } else if (change.action === "remove") {
        // Remove the line at the specified index
        if (index >= 0 && index < modifiedLines.length) {
          modifiedLines.splice(index, 1);
          offset -= 1; // Decrease offset because a line was removed
        }
      } else if (change.action === "replace" && change.content !== undefined) {
        // Replace the line at the specified index
        if (index >= 0 && index < modifiedLines.length) {
          modifiedLines[index] = change.content;
        }
      }
    });

    return modifiedLines;
  };
}
