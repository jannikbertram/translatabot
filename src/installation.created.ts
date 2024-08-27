import { Probot, ProbotOctokit } from "probot";
import { findFluentResourceFile } from "./translation_file_finder";
import path from "path";

// TODO: Automatically determine target branch name
export const MAIN_BRANCH = "main";
export const INITIALE_BRANCH_NAME = "colour-ai-translate-de-2";

export const createInitialPR = async (
  app: Probot,
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string
) => {
  const baseFilePath = await findFluentResourceFile(app, octokit, owner, repo);

  if (!baseFilePath) {
    app.log.error("No FluentResource file found");
    return;
  }

  app.log.info(`Found FluentResource file at ${baseFilePath}`);

  try {
    const baseFileContent = (await octokit.repos.getContent({
      owner,
      repo,
      path: baseFilePath,
    })) as { data: { content: string } };

    // Get the latest commit SHA of the main branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${MAIN_BRANCH}`,
    });

    const mainCommitSha = refData.object.sha;

    // Get the tree SHA of the latest commit
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: mainCommitSha,
    });

    const treeSha = commitData.tree.sha;

    // Create a new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${INITIALE_BRANCH_NAME}`,
      sha: mainCommitSha,
    });

    // 3. Create a new blob for the copied content
    const { data: newBlob } = await octokit.git.createBlob({
      owner,
      repo,
      content: baseFileContent.data.content,
      encoding: "base64",
    });

    // 4. Create a new tree with the updated de.ts file
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: [
        {
          path: path.join(path.dirname(baseFilePath), "de.ts"),
          mode: "100644",
          type: "blob",
          sha: newBlob.sha,
        },
      ],
    });

    // 5. Create a new commit with the new tree
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: "Copy content from en.json to de.json for first translation",
      tree: newTree.sha,
      parents: [mainCommitSha],
    });

    // 6. Update the branch reference to point to the new commit
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${INITIALE_BRANCH_NAME}`,
      sha: newCommit.sha,
    });

    // 7. Create a pull request from the new branch to the main branch
    await octokit.pulls.create({
      owner,
      repo,
      title: "First translation for DE",
      head: INITIALE_BRANCH_NAME,
      base: MAIN_BRANCH,
      body: "This PR copies the content of en.json to de.json as the first step of the translation process.",
    });
  } catch (error) {
    app.log.error(error as Error);
    throw error;
  }
};
