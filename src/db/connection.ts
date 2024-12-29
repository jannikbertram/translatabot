import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as Sentry from "@sentry/node";

let mongoServer: MongoMemoryServer;

export async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_ATLAS_CONNECTION_STRING;
    if (uri) {
      await mongoose.connect(uri);
      console.log("Connected to real MongoDB");
    } else {
      // Use in-memory database for development and testing
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log("Connected to in-memory MongoDB");
    }
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
