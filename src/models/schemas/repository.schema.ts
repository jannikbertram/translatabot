import { Schema, model } from "mongoose";
import { actionLogSchema, IActionLog } from "./action_log.schema";

export interface IRepository {
  installationId: number;
  name: string;
  isActive: boolean;
  actionLog: IActionLog[];
  createdAt: Date;
  updatedAt: Date;
}

const repositorySchema = new Schema<IRepository>({
  installationId: { type: Number, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: true },
  actionLog: [actionLogSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

repositorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

repositorySchema.index({ installationId: 1, name: 1 }, { unique: true });

export const Repository = model<IRepository>("Repository", repositorySchema);
