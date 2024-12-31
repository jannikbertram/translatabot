import { ProbotOctokit } from "probot";
import { Document as YamlDocument, parse as yamlParse } from "yaml";

import { getFileContent } from "../github/github";
import { CONFIG_FILE_PATH } from "../setup/installation.created";

export const DEFAULT_PATH_COMMENT = " Path to the default translation file";
export const RELATIVE_PATH_COMMENT =
  " Relative path to the auto-translated file";
export const LANGUAGE_COMMENT =
  " English name of the language to be translated to.";

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
  encoding: "base64" | "utf8" = "utf8"
) => {
  const config = defaultConfig(defaultPath ?? fallbackDefaultPath, [
    { relativePath: "de.ts", language: "German" },
  ]);
  const yaml = new YamlDocument(config);
  const defaultPathObj = yaml.get("defaultPath", true) as YamlNode;
  if (defaultPathObj) {
    defaultPathObj.comment = DEFAULT_PATH_COMMENT;
  }
  const firstRelativePathObj = yaml.getIn(
    ["languages", 0, "relativePath"],
    true
  ) as YamlNode;
  if (firstRelativePathObj) {
    firstRelativePathObj.comment = RELATIVE_PATH_COMMENT;
  }
  const firstLanguageObj = yaml.getIn(
    ["languages", 0, "language"],
    true
  ) as YamlNode;
  if (firstLanguageObj) {
    firstLanguageObj.comment = LANGUAGE_COMMENT;
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

  return verifyConfig(yamlParse(configFileContent));
};

const verifyConfig = (config: AppConfigFile): AppConfigFile => {
  if (!config?.defaultPath) {
    throw new Error("No default path found in config");
  }

  if (!config.languages || config.languages.length === 0) {
    throw new Error("No languages found in config");
  }

  return config;
};
