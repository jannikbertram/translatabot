import { dirname, join } from "path";
import { ProbotOctokit } from "probot";

import { AppConfigFile, TargetLanguage } from "../config/config";
import { Gemini } from "../gemini/gemini";
import { getDefaultBranch, getFileContent } from "../github/github";
import { generateBranchName } from "./branchName";
import { getRepositoryOrCreate } from "../models/repositories/repository.repository";
import { createPullRequestDoc } from "../models/repositories/pullRequest.repository";

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
  let content: string;
  const isJsonFile = config.defaultPath.endsWith(".json");

  if (isJsonFile) {
    const jsonContent = JSON.parse(baseFileContent);

    // Only look at first few lines to detect indentation
    const firstLines = baseFileContent.split("\n", 3);
    const indent =
      firstLines
        .find((line) => line.startsWith("  ") || line.startsWith("\t"))
        ?.match(/^(\s+)/)?.[1] || "  ";

    const translatedContent = await GeminiModel.translateFullFromJson(
      jsonContent,
      language.language
    );

    content = Buffer.from(
      JSON.stringify(translatedContent, null, indent)
    ).toString("base64");
  } else {
    content = await GeminiModel.translateFull(
      baseFileContent,
      language.language
    );
  }

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

  const targetPath = join(dirname(config.defaultPath), language.relativePath);
  // 4. Create a new tree with the updated de.ts file
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: treeSha,
    tree: [
      {
        path: targetPath,
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

  const targetPRTitle = `[translatabot] Translation to ${language.language}`;
  const targetPRBody = `This PR contains the initial translation of \`${config.defaultPath}\` into **${language.language}**.`;
  // 7. Create a pull request from the new branch to the main branch
  const pr = await octokit.pulls.create({
    owner,
    repo,
    title: targetPRTitle,
    head: branchName,
    base: baseBranchOrDefault,
    body: targetPRBody,
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
    prNumber: pr.data.number,
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
