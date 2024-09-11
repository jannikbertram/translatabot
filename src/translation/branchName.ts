import { ProbotOctokit } from "probot";
import { checkBranchExists } from "../github/github";
import { format } from "date-fns";
import { APP_NAME } from "../config/config";

const PARTIAL_UPDATE_BRANCH_LABEL = "partial";

export type GenerateBranchNameProps = {
  octokit: InstanceType<typeof ProbotOctokit>;
  owner: string;
  repo: string;
  language?: string;
  commitHashShort: string;
};

export const generateBranchName = async ({
  octokit,
  owner,
  repo,
  language,
  commitHashShort,
}: GenerateBranchNameProps): Promise<string> => {
  const defaultBranchName = `${APP_NAME}/${
    language?.toLowerCase() ?? PARTIAL_UPDATE_BRANCH_LABEL
  }/${commitHashShort}`;

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
