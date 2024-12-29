import { Schema, model } from "mongoose";

export interface IInstallation {
  installationId: number;
  user: {
    id: number;
    login: string;
    type: "User" | "Organization" | "Bot";
    email?: string;
  };
  repositorySelection: "all" | "selected";
  createdAt: Date;
  updatedAt: Date;
}

const installationSchema = new Schema<IInstallation>({
  installationId: { type: Number, required: true, unique: true },
  user: {
    id: { type: Number, required: true },
    login: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["User", "Organization", "Bot"],
    },
    email: { type: String, required: false },
  },
  repositorySelection: {
    type: String,
    required: false,
    enum: ["all", "selected"],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

installationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Installation = model<IInstallation>(
  "Installation",
  installationSchema
);
