import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

if (process.env.ENV === "prod") {
  Sentry.init({
    environment: process.env.ENV,
    dsn: "https://fa26b75a35ab25001f37a38b2ef4acd7@o4507939297820672.ingest.de.sentry.io/4507939302080592",
    integrations: [nodeProfilingIntegration()],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions

    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
}
