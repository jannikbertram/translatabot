import { Probot, ProbotOctokit } from "probot";
import { getDefaultBranch } from "../github/github";
import { APP_NAME, defaultConfigYaml } from "../config/config";
import { findFluentResourceFile } from "./translation_file_finder";

export const INITIAL_BRANCH_NAME = `${APP_NAME}/config`;
export const CONFIG_FILE_PATH = ".github/translatabot.yml";

export const createInitialPR = async (
  app: Probot,
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string
) => {
  const commitMessage = `Add ${APP_NAME} configuration file`;

  try {
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

    const baseFilePath = await findFluentResourceFile(
      app,
      octokit,
      owner,
      repo
    );

    if (baseFilePath) {
      app.log.info(
        `Found FluentResource file at ${baseFilePath} in ${owner}/${repo}`
      );
    } else {
      app.log.info(`No FluentResource file found in ${owner}/${repo}`);
    }

    // Create the configuration file in the new branch
    await octokit.repos.createOrUpdateFileContents({
      owner: owner,
      repo,
      path: CONFIG_FILE_PATH,
      message: commitMessage,
      content: defaultConfigYaml(baseFilePath, "base64"),
      branch: INITIAL_BRANCH_NAME,
    });

    // Create a Pull Request to merge the new configuration
    await octokit.pulls.create({
      owner,
      repo,
      title: "Add default configuration file",
      head: INITIAL_BRANCH_NAME,
      base: defaultBranch,
      body:
        "This PR adds a default configuration file for Translatabot\n" +
        "Make sure to update 'defaultPath' and 'languages' according to your needs.",
    });

    app.log.info(`PR created successfully in ${owner}/${repo}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : error;
    app.log.error(`Failed to create PR in ${owner}/${repo}: ${errorMessage}`);
  }
};
