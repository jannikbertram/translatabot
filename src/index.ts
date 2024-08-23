import { Probot } from "probot";

import { findFluentResourceFile } from "./translation_file_finder";
import path from "path";

// TODO: Automatically determine target branch name
export const MAIN_BRANCH = "main";
export const INITIALE_BRANCH_NAME = "colour-ai-translate-de";

export default (app: Probot) => {
  app.on("installation.created", async (context) => {
    const baseFilePath = await findFluentResourceFile(context.octokit);

    if (!baseFilePath) {
      app.log.error("No FluentResource file found");
      return;
    }

    try {
      const baseFileContent = await context.octokit.repos.getContent({
        ...context.repo(),
        path: baseFilePath,
      });

      const octokit = context.octokit;

      // Get the latest commit SHA of the main branch
      const { data: refData } = await octokit.git.getRef({
        ...context.repo(),
        ref: `heads/${MAIN_BRANCH}`,
      });

      const mainCommitSha = refData.object.sha;

      // Get the tree SHA of the latest commit
      const { data: commitData } = await octokit.git.getCommit({
        ...context.repo(),
        commit_sha: mainCommitSha,
      });

      const treeSha = commitData.tree.sha;

      // Create a new branch
      await octokit.git.createRef({
        ...context.repo(),
        ref: `refs/heads/${INITIALE_BRANCH_NAME}`,
        sha: mainCommitSha,
      });

      // 3. Create a new blob for the copied content
      const { data: newBlob } = await octokit.git.createBlob({
        ...context.repo(),
        content: baseFileContent.data.toString(),
        encoding: "utf-8",
      });

      // 4. Create a new tree with the updated de.json file
      const { data: newTree } = await octokit.git.createTree({
        ...context.repo(),
        base_tree: treeSha,
        tree: [
          {
            path: path.join(path.dirname(baseFilePath), "de.json"),
            mode: "100644",
            type: "blob",
            sha: newBlob.sha,
          },
        ],
      });

      // 5. Create a new commit with the new tree
      const { data: newCommit } = await octokit.git.createCommit({
        ...context.repo(),
        message: "Copy content from en.json to de.json for first translation",
        tree: newTree.sha,
        parents: [mainCommitSha],
      });

      // 6. Update the branch reference to point to the new commit
      await octokit.git.updateRef({
        ...context.repo(),
        ref: `heads/${INITIALE_BRANCH_NAME}`,
        sha: newCommit.sha,
      });

      // 7. Create a pull request from the new branch to the main branch
      await octokit.pulls.create({
        ...context.repo(),
        title: "First translation for DE",
        head: INITIALE_BRANCH_NAME,
        base: MAIN_BRANCH,
        body: "This PR copies the content of en.json to de.json as the first step of the translation process.",
      });
    } catch (error) {
      app.log.error(error as Error);
    }
  });

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    await context.octokit.issues.createComment(issueComment);
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
