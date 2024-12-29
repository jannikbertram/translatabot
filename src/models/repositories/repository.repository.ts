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
}): Promise<WithObjectId<IRepository>> {
  return await Repository.findOneAndUpdate(
    { installationId, name },
    {
      isActive,
      $push: { actionLog: { message: action } },
    },
    { new: true, upsert: true }
  ).lean();
}

export async function getRepositoriesByInstallationId(
  installationId: number
): Promise<WithObjectId<IRepository>[]> {
  return Repository.find({ installationId }).lean();
}

export async function getRepository(
  installationId: number,
  name: string
): Promise<WithObjectId<IRepository> | null> {
  return Repository.findOne({ installationId, name }).lean();
}

export async function getRepositoryOrCreate(
  installationId: number,
  name: string,
  createAction?: string
): Promise<WithObjectId<IRepository>> {
  const repository = await getRepository(installationId, name);
  if (!repository) {
    return upsertRepository({
      installationId,
      name,
      isActive: true,
      action: createAction,
    });
  }
  return repository;
}
