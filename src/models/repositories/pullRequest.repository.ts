import { PullRequest, IPullRequest } from "../schemas/pull_request.schema";
import { WithObjectId } from "../../db/mongoose.utils";

export async function createPullRequestDoc(
  pullRequestData: Omit<IPullRequest, "createdAt" | "updatedAt">
): Promise<WithObjectId<IPullRequest> | null> {
  let sizeLimitExceeded = false;
  // Calculate total byte size of contentPerFile
  const contentSize = pullRequestData.contentPerFile.reduce((size, file) => {
    if (!file.content) return size;
    // Convert string to Buffer to get actual byte length
    return size + Buffer.byteLength(file.content, "utf8");
  }, 0);

  // If content is larger than 1MB, set to empty array
  if (contentSize > 1024 * 1024) {
    sizeLimitExceeded = true;
  }

  const pullRequest = new PullRequest(
    sizeLimitExceeded
      ? {
          ...pullRequestData,
          contentPerFile: [],
          contentSizeLimitExceeded: true,
        }
      : pullRequestData
  );
  const pullRequestDoc = await pullRequest.save();
  return pullRequestDoc.toObject();
}

export async function getPullRequestDoc(
  repositoryFullName: string,
  prNumber: number
): Promise<WithObjectId<IPullRequest> | null> {
  return PullRequest.findOne({ repositoryFullName, prNumber }).lean();
}
