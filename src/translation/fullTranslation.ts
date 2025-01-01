import { dirname, join } from "path";
import { ProbotOctokit } from "probot";

import { AppConfigFile, TargetLanguage } from "../config/config";
import { Gemini } from "../gemini/gemini";
import {
  getDefaultBranch,
  getFileContent,
  createPullRequestWithFiles,
} from "../github/github";
import { generateBranchName } from "./branchName";
import { getRepositoryOrCreate } from "../models/repositories/repository.repository";
import { createPullRequestDoc } from "../models/repositories/pullRequest.repository";
import { format } from "date-fns";

export type FullTranslationProps = {
  octokit: InstanceType<typeof ProbotOctokit>;
  config: AppConfigFile;
  installationId: number;
  owner: string;
  repo: string;
  language: TargetLanguage;
  baseBranch?: string;
};

export const fullLanguageTranslationPR = async ({
  octokit,
  config,
  installationId,
  owner,
  repo,
  language,
  baseBranch,
}: FullTranslationProps) => {
  const baseBranchOrDefault =
    baseBranch ?? (await getDefaultBranch(octokit, owner, repo));

  const baseFileContent = await getFileContent(
    octokit,
    config.defaultPath,
    owner,
    repo,
    { ref: baseBranchOrDefault }
  );

  if (!baseFileContent) {
    console.error(
      `Base file ${config.defaultPath} not found in ${owner}/${repo}`
    );
    return;
  }

  const GeminiModel = new Gemini();
  const content = await GeminiModel.translateFull(
    baseFileContent,
    language.language
  );

  const targetPath = join(dirname(config.defaultPath), language.relativePath);

  // Create a new branch name
  const branchName = await generateBranchName({
    octokit,
    language: language.language,
    fallbackName: format(Date.now(), "yyyyMMdd-HHmm"),
    owner,
    repo,
  });

  const targetPRTitle = `[translatabot] Translation to ${language.language}`;
  const targetPRBody = `This PR contains the initial translation of \`${config.defaultPath}\` into **${language.language}**.`;

  // Create pull request with the translated file
  const pr = await createPullRequestWithFiles({
    octokit,
    owner,
    repo,
    files: [
      {
        path: targetPath,
        content,
      },
    ],
    title: targetPRTitle,
    body: targetPRBody,
    message: `Initial translation of ${config.defaultPath} into target languages`,
    branch: branchName,
    base: baseBranchOrDefault,
  });

  const repoName = `${owner}/${repo}`;
  const repoDoc = await getRepositoryOrCreate(
    installationId,
    repoName,
    "repo did not exist in installation, created it full translation flow."
  );

  await createPullRequestDoc({
    installationId,
    repositoryId: repoDoc._id.toString(),
    repositoryFullName: repoName,
    prNumber: pr.number,
    title: targetPRTitle,
    body: targetPRBody,
    contentPerFile: [
      {
        path: targetPath,
        content,
        language: language.language,
      },
    ],
    baseBranch: baseBranchOrDefault,
    branchName,
    type: "full_translation",
  });
};
