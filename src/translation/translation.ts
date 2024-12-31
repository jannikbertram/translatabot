import { dirname, join } from "path";
import { ProbotOctokit } from "probot";

import { AppConfigFile, TargetLanguage } from "../config/config";
import { getFileContent } from "../github/github";
import { CONFIG_FILE_PATH } from "../setup/installation.created";
import { fullLanguageTranslationPR } from "./fullTranslation";
import { partialTranslationUpdatePR } from "./partialTranslation";

type PullRequestProps = {
  octokit: InstanceType<typeof ProbotOctokit>;
  config: AppConfigFile;
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
  baseBranch: string;
};

export const createTranslationPR = async ({
  octokit,
  config,
  installationId,
  owner,
  repo,
  prNumber,
  baseBranch,
}: PullRequestProps) => {
  const logPrefix = `[${owner}/${repo}]`;
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
    console.log(
      `${logPrefix} No relevant changes in PR #${prNumber}. Skipping...`
    );
    return;
  }

  if (hasConfigChanged) {
    console.log(
      `${logPrefix} Configuration file has changed in PR #${prNumber}`
    );

    const newLanguages: TargetLanguage[] = [];
    for (const language of config.languages) {
      const languageFile = await getFileContent(
        octokit,
        join(dirname(config.defaultPath), language.relativePath),
        owner,
        repo,
        { ref: baseBranch }
      );
      if (!languageFile) {
        newLanguages.push(language);
      }
    }

    if (newLanguages.length === 0) {
      console.log(
        `${logPrefix} No new languages found in new config from PR #${prNumber}`
      );
    }

    for (const newLanguage of newLanguages) {
      console.log(
        `${logPrefix} New language found in config update from PR #${prNumber}`
      );
      await fullLanguageTranslationPR({
        octokit,
        config,
        installationId,
        owner,
        repo,
        language: newLanguage,
        baseBranch,
      });
      console.log(
        `${logPrefix} Created PR for language '${newLanguage.language}'`
      );
    }
  }

  if (!hasTranslationChanged || !translationChanges) return;

  console.log(`${logPrefix} Translation file has changed in PR #${prNumber}`);
  await partialTranslationUpdatePR({
    octokit,
    config,
    installationId,
    owner,
    repo,
    defaultFileChanges: translationChanges,
    prNumber,
    baseBranch,
  });
  console.log(
    `${logPrefix} Created PR for partial translation update of ${config.languages.length} languages`
  );
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
