import { Schema, model } from "mongoose";
import { actionLogSchema, IActionLog } from "./action_log.schema";

export interface IMarketplacePurchaseAccount {
  type: string;
  node_id: string;
  login: string;
  organization_billing_email?: string;
}

export type MarketplacePurchaseAction =
  | "purchased"
  | "cancelled"
  | "changed"
  | "pending_change"
  | "pending_change_cancelled";

export interface IMarketplacePurchase {
  accountId: number;
  account: IMarketplacePurchaseAccount;
  action: MarketplacePurchaseAction;
  createdAt: Date;
  updatedAt: Date;
  actionLog: IActionLog[];
}

const marketplacePurchaseAccountSchema =
  new Schema<IMarketplacePurchaseAccount>({
    type: { type: String, required: true },
    node_id: { type: String, required: true },
    login: { type: String, required: true },
    organization_billing_email: { type: String, required: false },
  });

const marketplacePurchaseSchema = new Schema<IMarketplacePurchase>({
  accountId: { type: Number, required: true, index: true },
  account: { type: marketplacePurchaseAccountSchema, required: true },
  action: {
    type: String,
    required: true,
    enum: [
      "purchased",
      "cancelled",
      "changed",
      "pending_change",
      "pending_change_cancelled",
    ],
  },
  actionLog: [actionLogSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

marketplacePurchaseSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const MarketplacePurchase = model<IMarketplacePurchase>(
  "MarketplacePurchase",
  marketplacePurchaseSchema
);
