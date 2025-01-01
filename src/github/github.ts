import { ProbotOctokit } from "probot";

export type GitOperations = {
  octokit: InstanceType<typeof ProbotOctokit>;
  owner: string;
  repo: string;
};

// Basic repository operations
export const getDefaultBranch = async (
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string
) => {
  const { data: repoData } = await octokit.repos.get({
    owner,
    repo,
  });

  return repoData.default_branch;
};

export const getFileContent = async (
  octokit: InstanceType<typeof ProbotOctokit>,
  path: string,
  owner: string,
  repo: string,
  options?: { ref?: string; encoding?: "base64" | "utf8" }
): Promise<string | null> => {
  try {
    const { data } = (await octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(options?.ref && { ref: options.ref }),
    })) as { data: { content: string } };

    if (options?.encoding === "base64") return data.content;

    if (!options?.encoding || options.encoding === "utf8") {
      return Buffer.from(data.content, "base64").toString("utf8");
    }

    throw new Error(`Encoding '${options.encoding}' not supported`);
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
};

export const checkBranchExists = async (
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string,
  branch: string
): Promise<boolean> => {
  try {
    await octokit.repos.getBranch({
      owner,
      repo,
      branch,
    });

    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
};

// Low-level Git operations
const getLatestCommit = async ({
  octokit,
  owner,
  repo,
  branch,
}: GitOperations & { branch: string }) => {
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: refData.object.sha,
  });

  return {
    commitSha: refData.object.sha,
    treeSha: commitData.tree.sha,
  };
};

const createBranch = async ({
  octokit,
  owner,
  repo,
  branchName,
  fromCommitSha,
}: GitOperations & {
  branchName: string;
  fromCommitSha: string;
}) => {
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: fromCommitSha,
  });
};

const createBlob = async ({
  octokit,
  owner,
  repo,
  content,
}: GitOperations & {
  content: string;
}) => {
  const { data: blob } = await octokit.git.createBlob({
    owner,
    repo,
    content,
    encoding: "base64",
  });

  return blob;
};

const createTree = async ({
  octokit,
  owner,
  repo,
  baseTreeSha,
  files,
}: GitOperations & {
  baseTreeSha: string;
  files: Array<{
    path: string;
    mode?: "100644" | "100755" | "040000" | "160000" | "120000";
    type?: "blob" | "tree" | "commit";
    sha: string;
  }>;
}) => {
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: files.map((file) => ({
      path: file.path,
      mode: file.mode ?? "100644",
      type: file.type ?? "blob",
      sha: file.sha,
    })),
  });

  return tree;
};

const createCommit = async ({
  octokit,
  owner,
  repo,
  message,
  treeSha,
  parentCommitSha,
}: GitOperations & {
  message: string;
  treeSha: string;
  parentCommitSha: string;
}) => {
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: treeSha,
    parents: [parentCommitSha],
  });

  return commit;
};

const updateBranch = async ({
  octokit,
  owner,
  repo,
  branchName,
  commitSha,
}: GitOperations & {
  branchName: string;
  commitSha: string;
}) => {
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branchName}`,
    sha: commitSha,
  });
};

// High-level operations
export type FileChange = {
  path: string;
  content: string;
};

/**
 * Creates or updates multiple files in a single commit.
 * Similar to createOrUpdateFileContents but handles multiple files at once.
 */
export const createOrUpdateFiles = async ({
  octokit,
  owner,
  repo,
  files,
  message,
  branch,
  createBranchIfNotExists = true,
}: GitOperations & {
  files: FileChange[];
  message: string;
  branch: string;
  createBranchIfNotExists?: boolean;
}) => {
  // Get the latest commit from the target branch or default branch
  const { commitSha, treeSha } = await getLatestCommit({
    octokit,
    owner,
    repo,
    branch,
  }).catch(async (error) => {
    if (error.status === 404 && createBranchIfNotExists) {
      // If branch doesn't exist, get default branch info
      const defaultBranch = await getDefaultBranch(octokit, owner, repo);
      const defaultBranchInfo = await getLatestCommit({
        octokit,
        owner,
        repo,
        branch: defaultBranch,
      });

      // Create the new branch
      await createBranch({
        octokit,
        owner,
        repo,
        branchName: branch,
        fromCommitSha: defaultBranchInfo.commitSha,
      });

      return defaultBranchInfo;
    }
    throw error;
  });

  // Create blobs for all files
  const blobPromises = files.map(async (file) => {
    const blob = await createBlob({
      octokit,
      owner,
      repo,
      content: file.content,
    });
    return {
      path: file.path,
      sha: blob.sha,
    };
  });

  const blobs = await Promise.all(blobPromises);

  // Create a new tree with all the files
  const tree = await createTree({
    octokit,
    owner,
    repo,
    baseTreeSha: treeSha,
    files: blobs,
  });

  // Create a new commit
  const commit = await createCommit({
    octokit,
    owner,
    repo,
    message,
    treeSha: tree.sha,
    parentCommitSha: commitSha,
  });

  // Update the branch reference
  await updateBranch({
    octokit,
    owner,
    repo,
    branchName: branch,
    commitSha: commit.sha,
  });

  return commit;
};

/**
 * Creates a pull request with multiple file changes.
 * This combines createOrUpdateFiles with PR creation in a single operation.
 */
export const createPullRequestWithFiles = async ({
  octokit,
  owner,
  repo,
  files,
  title,
  body,
  message,
  branch,
  base,
  createBranchIfNotExists = true,
}: GitOperations & {
  files: FileChange[];
  title: string;
  body: string;
  message: string;
  branch: string;
  base?: string;
  createBranchIfNotExists?: boolean;
}) => {
  // Get default branch if base not specified
  const baseBranch = base ?? (await getDefaultBranch(octokit, owner, repo));

  // Create or update files in the branch
  await createOrUpdateFiles({
    octokit,
    owner,
    repo,
    files,
    message,
    branch,
    createBranchIfNotExists,
  });

  // Create pull request
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: branch,
    base: baseBranch,
  });

  return pr;
};

export const listPullRequestFiles = async ({
  octokit,
  owner,
  repo,
  pullNumber,
}: GitOperations & {
  pullNumber: number;
}) => {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return files;
};
