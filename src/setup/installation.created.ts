import { Probot, ProbotOctokit } from "probot";

import { defaultConfigYaml } from "../config/config";
import { getDefaultBranch } from "../github/github";
import { findFluentResourceFile } from "./translation_file_finder";
import { createPullRequestDoc } from "../models/repositories/pullRequest.repository";
import { getRepositoryOrCreate } from "../models/repositories/repository.repository";

export const INITIAL_BRANCH_NAME = "translatabot/config";
export const CONFIG_FILE_PATH = `.github/translatabot.yml`;
export const INITIAL_PR_TITLE = `[translatabot] Add configuration file`;
export const INITIAL_PR_BODY =
  `This PR adds a configuration file for Translatabot\n` +
  "Make sure to update 'defaultPath' and 'languages' according to your needs.";

export const createInitialPR = async ({
  app,
  octokit,
  installationId,
  owner,
  repo,
}: {
  app: Probot;
  octokit: InstanceType<typeof ProbotOctokit>;
  installationId: number;
  owner: string;
  repo: string;
}) => {
  const commitMessage = `[translatabot] Add configuration file`;

  const defaultBranch = await getDefaultBranch(octokit, owner, repo);

  // Create a new branch from the default branch
  const { data: refData } = await octokit.git.getRef({
    owner: owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${INITIAL_BRANCH_NAME}`,
    sha: refData.object.sha,
  });

  const baseFilePath = await findFluentResourceFile(app, octokit, owner, repo);

  if (baseFilePath) {
    app.log.info(
      `Found FluentResource file at ${baseFilePath} in ${owner}/${repo}`
    );
  } else {
    app.log.info(`No FluentResource file found in ${owner}/${repo}`);
  }

  const content = defaultConfigYaml(baseFilePath, "base64");
  // Create the configuration file in the new branch
  await octokit.repos.createOrUpdateFileContents({
    owner: owner,
    repo,
    path: CONFIG_FILE_PATH,
    message: commitMessage,
    content,
    branch: INITIAL_BRANCH_NAME,
  });

  // Create a Pull Request to merge the new configuration
  const pr = await octokit.pulls.create({
    owner,
    repo,
    title: INITIAL_PR_TITLE,
    head: INITIAL_BRANCH_NAME,
    base: defaultBranch,
    body: INITIAL_PR_BODY,
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
    prNumber: pr.data.number,
    title: INITIAL_PR_TITLE,
    body: INITIAL_PR_BODY,
    content,
    baseBranch: defaultBranch,
    branchName: INITIAL_BRANCH_NAME,
    type: "initial",
  });

  app.log.info(`Created PR to add config file in ${owner}/${repo}`);
};
