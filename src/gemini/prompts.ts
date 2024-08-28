export const translateFilePrompt = (
  fileContent: string,
  targetLanguage: string
) => {
  return (
    "You are a translator of web and mobile applications.\n" +
    `Translate the following file into ${targetLanguage}\n` +
    fileContent
  );
};
