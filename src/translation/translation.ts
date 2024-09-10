import { Probot, ProbotOctokit } from "probot";
import { AppConfigFile, TargetLanguage } from "../config/config";
import { CONFIG_FILE_PATH } from "../setup/installation.created";
import { getFileContent } from "../github/github";
import { resolve } from "path";
import { fullLanguageTranslationPR } from "./fullTranslation";
import { partialTranslationUpdatePR } from "./partialTranslation";

type PullRequestProps = {
  app: Probot;
  octokit: InstanceType<typeof ProbotOctokit>;
  config: AppConfigFile;
  owner: string;
  repo: string;
  prNumber: number;
  baseBranch: string;
};

export const createTranslationPR = async ({
  app,
  octokit,
  config,
  owner,
  repo,
  prNumber,
  baseBranch,
}: PullRequestProps) => {
  const { hasConfigChanged, hasTranslationChanged, translationChanges } =
    await getRelevantPRChanges(
      octokit,
      config.defaultPath,
      CONFIG_FILE_PATH,
      owner,
      repo,
      prNumber
    );

  if (!hasConfigChanged && !hasTranslationChanged) {
    app.log.info(
      `No relevant changes in PR #${prNumber} for ${owner}/${repo}. Skipping...`
    );
    return;
  }

  if (hasConfigChanged) {
    app.log.info(`Configuration file has changed in PR #${prNumber}`);

    const newLanguages: TargetLanguage[] = [];
    for (const language of config.languages) {
      const languageFile = await getFileContent(
        octokit,
        resolve(config.defaultPath, language.relativePath),
        owner,
        repo,
        { ref: baseBranch }
      );
      if (!languageFile) {
        newLanguages.push(language);
      }
    }

    if (newLanguages.length === 0) {
      app.log.info(
        `No new languages found in new config from PR #${prNumber} for ${owner}/${repo}`
      );
    }

    for (const newLanguage of newLanguages) {
      app.log.info(
        `New language found in new config from PR #${prNumber} for ${owner}/${repo}`
      );
      await fullLanguageTranslationPR({
        app,
        octokit,
        config,
        owner,
        repo,
        language: newLanguage,
        baseBranch,
      });
    }
  }

  if (!hasTranslationChanged || !translationChanges) return;

  app.log.info(`Translation file has changed in PR #${prNumber}`);
  await partialTranslationUpdatePR({
    app,
    octokit,
    config,
    owner,
    repo,
    defaultFileChanges: translationChanges,
    prNumber,
    baseBranch,
  });
};

const getRelevantPRChanges = async (
  octokit: InstanceType<typeof ProbotOctokit>,
  defaultTranslationFilePath: string,
  configFilePath: string,
  owner: string,
  repo: string,
  prNumber: number
) => {
  const files = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  const changedFiles = files.data.map((file) => file.filename);

  const hasConfigChanged = changedFiles.includes(configFilePath);
  const hasTranslationChanged = changedFiles.includes(
    defaultTranslationFilePath
  );
  let translationChanges: string | undefined;
  if (hasTranslationChanged) {
    translationChanges = files.data.find(
      (file) => file.filename === defaultTranslationFilePath
    )?.patch;
  }

  return {
    hasConfigChanged,
    hasTranslationChanged,
    translationChanges,
  };
};
