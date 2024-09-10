import { ProbotOctokit } from "probot";

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
