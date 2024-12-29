import { Schema, model } from "mongoose";

export type PullRequestType =
  | "initial"
  | "partial_translation"
  | "full_translation";

export interface IPullRequest {
  installationId: number;
  repositoryId: string;
  repositoryFullName: string;
  prNumber: number;
  title: string;
  body: string;
  branchName: string;
  baseBranch: string;
  type: PullRequestType;
  sourceLanguage?: string;
  targetLanguage?: string;
  sourcePrNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

const pullRequestSchema = new Schema<IPullRequest>({
  installationId: { type: Number, required: true },
  repositoryFullName: { type: String, required: true },
  prNumber: { type: Number, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  baseBranch: { type: String, required: true },
  branchName: { type: String, required: true },
  type: { type: String, required: true, enum: ["initial", "translation"] },
  sourceLanguage: { type: String, required: false },
  targetLanguage: { type: String, required: false },
  sourcePrNumber: { type: Number, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

pullRequestSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const PullRequest = model<IPullRequest>(
  "PullRequest",
  pullRequestSchema
);
