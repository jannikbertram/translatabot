import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as Sentry from "@sentry/node";

let mongoServer: MongoMemoryServer;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function attemptConnection(): Promise<void> {
  try {
    let uri = process.env.MONGODB_ATLAS_CONNECTION_STRING;
    let isInMemory = false;
    if (!uri) {
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      isInMemory = true;
    }
    await mongoose.connect(uri);
    console.log(`Connected to ${isInMemory ? "in-memory" : "real"} MongoDB`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    Sentry.captureException(error);
    throw error;
  }
}

export async function connectToDatabase(maxRetries = 3): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await attemptConnection();
      return; // Connection successful
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const backoffTime = attempt * 1000; // 1s, 2s, 3s
        console.log(
          `Retrying connection in ${backoffTime}ms (attempt ${attempt}/${maxRetries})`
        );
        await delay(backoffTime);
      }
    }
  }

  // If we get here, all retries failed
  console.error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
  throw lastError;
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
