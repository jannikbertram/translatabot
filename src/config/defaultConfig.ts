import { Document as YamlDocument } from "yaml";

export type TargetLanguage = {
  relativePath: string;
  language: string;
};

export type AppConfigFile = {
  version: number;
  defaultPath: string;
  languages: TargetLanguage[];
};

const fallbackDefaultPath = "path/to/translation_file.ts";

const defaultConfig = (defaultPath: string, languages: TargetLanguage[]) => ({
  version: 1,
  defaultPath,
  languages,
});

export const defaultConfigYaml = (
  defaultPath: string | undefined,
  encoding: "base64" | "utf-8" = "utf-8"
) => {
  const config = defaultConfig(defaultPath ?? fallbackDefaultPath, [
    { relativePath: "de.ts", language: "German" },
  ]);
  const yaml = new YamlDocument(config);
  const defaultPathObj = yaml.get("defaultPath") as { comment: string };
  if (defaultPathObj) {
    //defaultPathObj.comment = "Path to the default translation file";
  }
  const firstRelativePathObj = yaml.getIn(["languages", 0, "relativePath"]) as {
    comment: string;
  };
  if (firstRelativePathObj) {
    //firstRelativePathObj.comment =
    //  "Relative path to the auto-translated file. Make sure the file path matches the original file.";
  }
  const firstLanguageObj = yaml.getIn(["languages", 0, "language"]) as {
    comment: string;
  };
  if (firstLanguageObj) {
    //firstLanguageObj.comment =
    //  "English name of the language to be translated to.";
  }

  return Buffer.from(yaml.toString()).toString(encoding);
};
