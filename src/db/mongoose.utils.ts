import { Types } from "mongoose";

export type WithObjectId<T> = T & {
  _id: Types.ObjectId;
};
