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
