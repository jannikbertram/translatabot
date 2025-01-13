import { dirname, join } from "path";
import { ProbotOctokit } from "probot";

import { AppConfigFile } from "../config/config";
import { Gemini } from "../gemini/gemini";
import { getDefaultBranch, getFileContent } from "../github/github";
import { generateBranchName } from "./branchName";
import { getRepositoryOrCreate } from "../models/repositories/repository.repository";
import { createPullRequestDoc } from "../models/repositories/pullRequest.repository";

type PartialTranslationProps = {
  octokit: InstanceType<typeof ProbotOctokit>;
  config: AppConfigFile;
  installationId: number;
  owner: string;
  repo: string;
  defaultFileChanges: string;
  prNumber: number;
  baseBranch: string;
  baseCommitSha: string;
};

export const partialTranslationUpdatePR = async ({
  octokit,
  config,
  installationId,
  owner,
  repo,
  defaultFileChanges,
  prNumber,
  baseBranch,
  baseCommitSha,
}: PartialTranslationProps) => {
  const logPrefix = `[${owner}/${repo}]`;
  console.log(`${logPrefix} Translation file has changed in PR #${prNumber}`);

  const baseBranchOrDefault =
    baseBranch ?? (await getDefaultBranch(octokit, owner, repo));

  const GeminiModel = new Gemini();
  const blobPerLanguage = [];
  const contentPerFile = [];

  // Get the base file content to handle JSON files
  const baseFileContent = await getFileContent(
    octokit,
    config.defaultPath,
    owner,
    repo,
    { ref: baseBranchOrDefault }
  );

  const previousBaseFileContent = await getFileContent(
    octokit,
    config.defaultPath,
    owner,
    repo,
    { ref: baseCommitSha }
  );

  if (!baseFileContent) {
    const errorMsg = `Base file ${config.defaultPath} not found in ${owner}/${repo}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!previousBaseFileContent) {
    const errorMsg = `Previous version of base file ${config.defaultPath} with commit sha ${baseCommitSha} not found in ${owner}/${repo}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const isJsonFile = config.defaultPath.endsWith(".json");
  let previousBaseJsonObj;
  let baseJsonObj;
  let indent: string = "  ";

  if (isJsonFile) {
    previousBaseJsonObj = JSON.parse(previousBaseFileContent);
    baseJsonObj = JSON.parse(baseFileContent);
    // Only look at first few lines to detect indentation
    const firstLines = baseFileContent.split("\n", 3);
    indent =
      firstLines
        .find((line) => line.startsWith("  ") || line.startsWith("\t"))
        ?.match(/^(\s+)/)?.[1] ?? "  ";
  }

  for (const { language, relativePath } of config.languages) {
    const translationFilePath = join(dirname(config.defaultPath), relativePath);

    const translationFileContent = await getFileContent(
      octokit,
      translationFilePath,
      owner,
      repo,
      { ref: baseBranchOrDefault }
    );

    if (!translationFileContent) {
      console.error(
        `Translation file ${translationFilePath} not found in ${owner}/${repo}`
      );
      continue;
    }

    let content: string;
    if (isJsonFile) {
      const targetJsonObj = JSON.parse(translationFileContent);
      const translatedContent = await GeminiModel.translatePartialFromJson({
        baseJsonObj,
        previousBaseJsonObj,
        targetLanguageFileObj: targetJsonObj,
        targetLanguage: language,
      });
      content = Buffer.from(
        JSON.stringify(translatedContent, null, indent) + "\n" // Newline to make Github happy
      ).toString("base64");
    } else {
      content = await GeminiModel.translatePartial(
        translationFileContent,
        defaultFileChanges,
        language
      );
    }

    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo,
      content,
      encoding: "base64",
    });

    blobPerLanguage.push(blob);
    contentPerFile.push({
      path: translationFilePath,
      content,
      language: language,
    });
  }

  // Get the latest commit SHA of the main branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranchOrDefault}`,
  });

  const commitSha = refData.object.sha;
  const commitShaShort = commitSha.slice(0, 7);

  // Get the tree SHA of the latest commit
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: commitSha,
  });

  const treeSha = commitData.tree.sha;

  // Create a new branch
  const branchName = await generateBranchName({
    octokit,
    commitHashShort: commitShaShort,
    owner,
    repo,
    prNumber,
  });
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: commitSha,
  });

  // 4. Create a new tree with the updated de.ts file
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: treeSha,
    tree: blobPerLanguage.filter(Boolean).map((blob, index) => ({
      path: join(
        dirname(config.defaultPath),
        config.languages[index].relativePath
      ),
      mode: "100644",
      type: "blob",
      sha: blob?.sha,
    })),
  });

  // 5. Create a new commit with the new tree
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: `Partial translation of ${commitShaShort} in ${config.languages.length} languages`,
    tree: newTree.sha,
    parents: [commitSha],
  });

  // 6. Update the branch reference to point to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
  });

  const targetPRTitle = `[translatabot] Translations for ${
    prNumber ? `#${prNumber}` : commitShaShort
  }`;
  const targetPRBody = `This PR contains updates to all translation files ${
    prNumber ? `based on the changes of #${prNumber}` : ""
  }`;
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
    "repo did not exist in installation, created it partial translation flow."
  );

  await createPullRequestDoc({
    installationId,
    repositoryId: repoDoc._id.toString(),
    repositoryFullName: repoName,
    prNumber: pr.data.number,
    title: targetPRTitle,
    body: targetPRBody,
    contentPerFile,
    baseBranch: baseBranchOrDefault,
    branchName,
    type: "partial_translation",
  });

  console.log(
    `${logPrefix} Created PR for partial translation update of ${config.languages.length} languages`
  );
};
