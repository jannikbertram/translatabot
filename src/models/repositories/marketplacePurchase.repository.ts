import * as Sentry from "@sentry/node";
import {
  MarketplacePurchase,
  IMarketplacePurchase,
  IMarketplacePurchaseAccount,
} from "../schemas/marketplace_purchase.schema";
import { WithObjectId } from "../../db/mongoose.utils";

export async function upsertMarketplacePurchase({
  accountId,
  account,
  action,
}: {
  accountId: number;
  account: IMarketplacePurchaseAccount;
  action: string;
}): Promise<WithObjectId<IMarketplacePurchase> | null> {
  try {
    return await MarketplacePurchase.findOneAndUpdate(
      { accountId },
      {
        account,
        $push: { actionLog: { message: action, timestamp: new Date() } },
      },
      { new: true, upsert: true }
    ).lean();
  } catch (error) {
    console.error("Error upserting marketplace purchase:", error);
    Sentry.captureException(error);
    return null;
  }
}
