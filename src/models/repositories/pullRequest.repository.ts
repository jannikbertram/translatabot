import * as Sentry from "@sentry/node";
import { PullRequest, IPullRequest } from "../schemas/pull_request.schema";
import { WithObjectId } from "../../db/mongoose.utils";

export async function createPullRequestDoc(
  pullRequestData: Omit<IPullRequest, "createdAt" | "updatedAt">
): Promise<WithObjectId<IPullRequest> | null> {
  try {
    const pullRequest = new PullRequest(pullRequestData);
    return await pullRequest.save();
  } catch (error) {
    console.error("Error creating pull request:", error);
    Sentry.captureException(error);
    return null;
  }
}

export async function getPullRequestDoc(
  repositoryFullName: string,
  prNumber: number
): Promise<WithObjectId<IPullRequest> | null> {
  return PullRequest.findOne({ repositoryFullName, prNumber }).lean();
}
