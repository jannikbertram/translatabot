import { ProbotOctokit } from "probot";
import { checkBranchExists } from "../github/github";
import { format } from "date-fns";

const PARTIAL_UPDATE_BRANCH_LABEL = "partial";

export type GenerateBranchNameProps = {
  octokit: InstanceType<typeof ProbotOctokit>;
  owner: string;
  repo: string;
  language?: string;
  commitHashShort: string;
  prNumber?: number;
};

export const generateBranchName = async ({
  octokit,
  owner,
  repo,
  language,
  commitHashShort,
  prNumber,
}: GenerateBranchNameProps): Promise<string> => {
  const defaultBranchName = `translatabot/${
    language?.toLowerCase() ?? PARTIAL_UPDATE_BRANCH_LABEL
  }/${prNumber ? `#${prNumber}` : commitHashShort}`;

  const branchExists = await checkBranchExists(
    octokit,
    owner,
    repo,
    defaultBranchName
  );

  if (!branchExists) return defaultBranchName;

  const dateTimeSuffix = format(Date.now(), "yyyyMMddHHmm");

  return `${defaultBranchName}-${dateTimeSuffix}`;
};
