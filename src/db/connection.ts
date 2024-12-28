import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as Sentry from "@sentry/node";

let mongoServer: MongoMemoryServer;

export async function connectToDatabase() {
  try {
    if (process.env.ENV === "prod" || process.env.ENV === "production") {
      // Use MongoDB Atlas in production
      const uri = process.env.MONGODB_ATLAS_CONNECTION_STRING;
      if (!uri) {
        throw new Error(
          "env variable MONGODB_ATLAS_CONNECTION_STRING is not set"
        );
      }
      await mongoose.connect(uri);
    } else {
      // Use in-memory database for development and testing
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    }
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    Sentry.captureException(error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error("MongoDB disconnection error:", error);
    Sentry.captureException(error);
  }
}
