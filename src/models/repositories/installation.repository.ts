import { Installation, IInstallation } from "../schemas/installation.schema";
import * as Sentry from "@sentry/node";
import { WithObjectId } from "../../db/mongoose.utils";
import { Installation as GithubInstallation } from "@octokit/webhooks-types";

export async function upsertInstallation(
  githubInstallation: GithubInstallation
): Promise<WithObjectId<IInstallation> | null> {
  try {
    const installation = await Installation.findOneAndUpdate(
      { installationId: githubInstallation.id },
      {
        user: {
          id: githubInstallation.account.id,
          login: githubInstallation.account.login,
          type: githubInstallation.account.type,
          email: githubInstallation.account.email,
        },
        repositorySelection: githubInstallation.repository_selection,
        updatedAt: new Date(),
      },
      { new: true, upsert: true }
    ).lean();
    return installation;
  } catch (error) {
    console.error("Error saving installation:", error);
    Sentry.captureException(error);
    return null;
  }
}

export async function getInstallation(
  installationId: number
): Promise<WithObjectId<IInstallation> | null> {
  return Installation.findOne({ installationId });
}
