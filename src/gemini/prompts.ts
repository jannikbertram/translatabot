const INSTRUCTIONS =
  "You are a translator of web and mobile applications.\n" +
  "You translate localization files into different languages.\n" +
  "Make sure to only ever translate the translation values, never the keys.\n";

export const fullTranslateFilePrompt = (
  fileContent: string,
  targetLanguage: string
) => {
  return (
    INSTRUCTIONS +
    `Translate the following file into ${targetLanguage}\n` +
    fileContent
  );
};

export const partialTranslateFilePrompt = (
  targetLanguageCurrentContent: string,
  targetLanguage: string,
  partialChanges: string
) => {
  return (
    INSTRUCTIONS +
    `Translate the changes of the Github patch into ${targetLanguage}.\n` +
    "The output MUST be valid JSON.\n" +
    "The output MUST be list of line changes to the file.\n" +
    "The schema of a line change is as follows:\n" +
    "{ line: number, action: 'add' | 'remove' | 'replace', content?: string }\n" +
    `Current file content:\n${targetLanguageCurrentContent}\n` +
    `Github patch:\n${partialChanges}\n`
  );
};
