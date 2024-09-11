import { Gemini } from "../gemini/gemini";
import { Probot, ProbotOctokit } from "probot";
import { dirname, join } from "path";
import { AppConfigFile, TargetLanguage } from "../config/config";
import { getDefaultBranch, getFileContent } from "../github/github";
import { generateBranchName } from "./branchName";

export type FullTranslationProps = {
  app: Probot;
  octokit: InstanceType<typeof ProbotOctokit>;
  config: AppConfigFile;
  owner: string;
  repo: string;
  language: TargetLanguage;
  baseBranch?: string;
};

export const fullLanguageTranslationPR = async ({
  app,
  octokit,
  config,
  owner,
  repo,
  language,
  baseBranch,
}: FullTranslationProps) => {
  try {
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
      app.log.error(
        `Base file ${config.defaultPath} not found in ${owner}/${repo}`
      );
      return;
    }

    const GeminiModel = new Gemini();
    const content = await GeminiModel.translateFull(
      baseFileContent,
      language.language
    );

    // Get the latest commit SHA of the main branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranchOrDefault}`,
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
    const branchName = await generateBranchName({
      octokit,
      language: language.language,
      commitHashShort: mainCommitSha.slice(0, 7),
      owner,
      repo,
    });
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: mainCommitSha,
    });

    // 3. Create a new blob for the copied content
    const { data: newBlob } = await octokit.git.createBlob({
      owner,
      repo,
      content,
      encoding: "base64",
    });

    // 4. Create a new tree with the updated de.ts file
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: [
        {
          path: join(dirname(config.defaultPath), language.relativePath),
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
      message: `Initial translation of ${config.defaultPath} into target languages`,
      tree: newTree.sha,
      parents: [mainCommitSha],
    });

    // 6. Update the branch reference to point to the new commit
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: newCommit.sha,
    });

    // 7. Create a pull request from the new branch to the main branch
    await octokit.pulls.create({
      owner,
      repo,
      title: `[translatabot] Translation to ${language.language}`,
      head: branchName,
      base: baseBranch ?? (await getDefaultBranch(octokit, owner, repo)),
      body: `This PR contains the initial translation of ${config.defaultPath} into ${language.language}.`,
    });
  } catch (error) {
    app.log.error(error as Error);
  }
};
