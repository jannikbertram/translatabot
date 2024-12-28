import "./instrument"; // setup Sentry

import { Probot } from "probot";

import * as Sentry from "@sentry/node";

import { getConfig } from "./config/config";
import { createInitialPR } from "./setup/installation.created";
import { createTranslationPR } from "./translation/translation";
import { connectToDatabase } from "./db/connection";
import { upsertInstallation } from "./services/installation.service";

// Connect to database when the app starts
connectToDatabase().catch((error) => {
  console.error("Failed to connect to database:", error);
  Sentry.captureException(error);
  process.exit(1);
});

export const App = (app: Probot) => {
  app.on("installation.created", async (context) => {
    const installation = context.payload.installation;

    // Save installation data
    await upsertInstallation(installation);

    // Create initial PRs for each repository
    const repos = context.payload.repositories ?? [];

    if (repos.length === 0) {
      app.log.info(`No repositories found for installation ${installation.id}`);
      return;
    }

    for (const repo of repos) {
      const owner = repo.full_name.split("/")[0];
      const repoName = repo.full_name.split("/")[1];

      Sentry.setUser({ id: repo.full_name, username: repo.full_name });
      Sentry.setContext("installation.created", { owner, repo: repoName });

      try {
        await createInitialPR(app, context.octokit, owner, repoName);
      } catch (error) {
        app.log.error(error as Error);
        Sentry.captureException(error);
      }
    }
  });

  app.on("pull_request.closed", async (context) => {
    // only consider merged pull requests
    if (!context.payload.pull_request.merged) return;

    const repo = context.payload.repository;

    const owner = repo.full_name.split("/")[0];
    const repoName = repo.full_name.split("/")[1];

    Sentry.setUser({ id: repo.full_name, username: repo.full_name });
    Sentry.setContext("pull_request.closed", { owner, repo: repoName });
    const prBaseBranch = context.payload.pull_request.base.ref;
    const config = await getConfig(
      context.octokit,
      owner,
      repoName,
      prBaseBranch
    );

    await createTranslationPR({
      app,
      octokit: context.octokit,
      config,
      owner,
      repo: repoName,
      prNumber: context.payload.pull_request.number,
      prTitle: context.payload.pull_request.title,
      baseBranch: context.payload.pull_request.base.ref,
    });
  });

  app.on("marketplace_purchase", async (context) => {
    app.log.info("Marketplace purchase event received", context.payload);
    return true;
  });

  app.onError((error) => {
    app.log.error(error as Error);
    Sentry.captureException(error);
  });
};

export default App;
