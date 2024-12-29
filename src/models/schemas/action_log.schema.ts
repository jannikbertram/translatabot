import { Schema } from "mongoose";

export interface IActionLog {
  message: string;
  timestamp: Date;
}

/**
 * This is not a collection itself, it is used by other schemas to define an action log
 */
export const actionLogSchema = new Schema<IActionLog>({
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
