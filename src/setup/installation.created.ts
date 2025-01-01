import { ProbotOctokit } from "probot";

import { defaultConfigYaml } from "../config/config";
import { getDefaultBranch, createPullRequestWithFiles } from "../github/github";
import { findDefaultTranslationFile } from "./translation_file_finder";
import { createPullRequestDoc } from "../models/repositories/pullRequest.repository";
import { getRepositoryOrCreate } from "../models/repositories/repository.repository";

export const INITIAL_BRANCH_NAME = "translatabot/config";
export const CONFIG_FILE_PATH = `.github/translatabot.yml`;
export const INITIAL_PR_TITLE = `[translatabot] Add configuration file`;
export const INITIAL_PR_BODY =
  `This PR adds a configuration file for Translatabot\n` +
  "Make sure to update 'defaultPath' and 'languages' according to your needs.";

export const createInitialPR = async ({
  octokit,
  installationId,
  owner,
  repo,
}: {
  octokit: InstanceType<typeof ProbotOctokit>;
  installationId: number;
  owner: string;
  repo: string;
}) => {
  const defaultBranch = await getDefaultBranch(octokit, owner, repo);

  const baseFilePath = await findDefaultTranslationFile(octokit, owner, repo);

  if (baseFilePath) {
    console.log(
      `Found FluentResource file at ${baseFilePath} in ${owner}/${repo}`
    );
  } else {
    console.log(`No FluentResource file found in ${owner}/${repo}`);
  }

  const content = defaultConfigYaml(baseFilePath, "base64");

  // Create pull request with the config file
  const pr = await createPullRequestWithFiles({
    octokit,
    owner,
    repo,
    files: [
      {
        path: CONFIG_FILE_PATH,
        content,
      },
    ],
    title: INITIAL_PR_TITLE,
    body: INITIAL_PR_BODY,
    message: `[translatabot] Add configuration file`,
    branch: INITIAL_BRANCH_NAME,
    base: defaultBranch,
  });

  const repositoryFullName = `${owner}/${repo}`;
  const repository = await getRepositoryOrCreate(
    installationId,
    repositoryFullName,
    "repo did not exist for installation, created it in initial PR flow"
  );

  await createPullRequestDoc({
    installationId,
    repositoryId: repository._id.toString(),
    repositoryFullName: repositoryFullName,
    prNumber: pr.number,
    title: INITIAL_PR_TITLE,
    body: INITIAL_PR_BODY,
    contentPerFile: [
      {
        path: CONFIG_FILE_PATH,
        content,
      },
    ],
    baseBranch: defaultBranch,
    branchName: INITIAL_BRANCH_NAME,
    type: "initial",
  });

  console.log(`Created PR to add config file in ${owner}/${repo}`);
};
