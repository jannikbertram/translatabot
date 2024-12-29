import * as Sentry from "@sentry/node";
import { Repository, IRepository } from "../schemas/repository.schema";
import { WithObjectId } from "../../db/mongoose.utils";

export async function upsertRepository({
  installationId,
  name,
  isActive,
  action,
}: {
  installationId: number;
  name: string;
  isActive: boolean;
  action?: string;
}): Promise<WithObjectId<IRepository> | null> {
  try {
    return await Repository.findOneAndUpdate(
      { installationId, name },
      {
        isActive,
        $push: { actionLog: { message: action } },
      },
      { new: true, upsert: true }
    ).lean();
  } catch (error) {
    console.error("Error upserting repository:", error);
    Sentry.captureException(error);
    return null;
  }
}

export async function getRepositoriesByInstallationId(
  installationId: number
): Promise<WithObjectId<IRepository>[]> {
  return Repository.find({ installationId }).lean();
}
