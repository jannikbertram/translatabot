import { parse as yamlParse, Document as YamlDocument } from "yaml";
import { getFileContent } from "../github/github";
import { CONFIG_FILE_PATH } from "../setup/installation.created";
import { ProbotOctokit } from "probot";

export const APP_NAME = "translatabot";

export type TargetLanguage = {
  relativePath: string;
  language: string;
};

export type AppConfigFile = {
  version: number;
  defaultPath: string;
  languages: TargetLanguage[];
};

type YamlNode = {
  comment?: string;
  commentBefore?: string;
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
  const defaultPathObj = yaml.get("defaultPath") as YamlNode;
  if (defaultPathObj) {
    defaultPathObj.commentBefore = "Path to the default translation file";
  }
  const firstRelativePathObj = yaml.getIn([
    "languages",
    0,
    "relativePath",
  ]) as YamlNode;
  if (firstRelativePathObj) {
    firstRelativePathObj.commentBefore =
      "Relative path to the auto-translated file. Make sure the file path matches the original file.";
  }
  const firstLanguageObj = yaml.getIn(["languages", 0, "language"]) as YamlNode;
  if (firstLanguageObj) {
    firstLanguageObj.commentBefore =
      "English name of the language to be translated to.";
  }

  return Buffer.from(yaml.toString()).toString(encoding);
};

export const getConfig = async (
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string,
  ref?: string
): Promise<AppConfigFile> => {
  const configFileContent = await getFileContent(
    octokit,
    CONFIG_FILE_PATH,
    owner,
    repo,
    {
      ref,
      encoding: "utf8",
    }
  );

  if (!configFileContent) {
    throw new Error("Config file not found");
  }

  return yamlParse(configFileContent) as AppConfigFile;
};
