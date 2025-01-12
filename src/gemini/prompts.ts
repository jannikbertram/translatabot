const INSTRUCTIONS =
  "You are a translator of web and mobile applications.\n" +
  "You translate localization files into different languages.\n" +
  "You MUST translate the values only, never the keys.\n";

export const fullTranslateFilePrompt = (
  fileContent: string,
  targetLanguage: string,
  context?: string
) => {
  return (
    INSTRUCTIONS +
    `Translate the following file into ${targetLanguage}\n` +
    (context
      ? `Previous translation context:\n${context}\n\nContinue translation with:\n`
      : "") +
    fileContent
  );
};

export const partialTranslateFilePrompt = (
  targetLanguageCurrentContent: string,
  targetLanguage: string,
  partialChanges: string,
  context?: string
) => {
  return (
    INSTRUCTIONS +
    "Apply the changes of the git diff into the translation file.\n" +
    `Added values must be translated to ${targetLanguage}.\n` +
    `git diff:\n${partialChanges}\n\n` +
    (context
      ? `Previous translation context:\n${context}\n\nContinue translation with:\n`
      : "") +
    `Translation file content:\n\n${targetLanguageCurrentContent}\n\n` +
    "The output MUST be the updated translation file content without line numbers.\n"
  );
};

export const translateLabelsPrompt = (
  labels: string,
  targetLanguage: string
) => {
  return `Translate all of these labels into ${targetLanguage} line by line:\n${labels}`;
};
