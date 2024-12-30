import * as Sentry from "@sentry/node";
import { PullRequest, IPullRequest } from "../schemas/pull_request.schema";
import { WithObjectId } from "../../db/mongoose.utils";

const MAX_CONTENT_LENGTH = 10000;

export async function createPullRequestDoc(
  pullRequestData: Omit<IPullRequest, "createdAt" | "updatedAt">
): Promise<WithObjectId<IPullRequest> | null> {
  try {
    if (pullRequestData.content.length > MAX_CONTENT_LENGTH) {
      console.warn(
        `Content truncated from ${pullRequestData.content.length} to ${MAX_CONTENT_LENGTH} characters`
      );
    }

    const pullRequest = new PullRequest({
      ...pullRequestData,
      content: pullRequestData.content.slice(0, MAX_CONTENT_LENGTH),
    });
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
