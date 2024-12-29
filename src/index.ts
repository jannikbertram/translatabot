import "./instrument"; // setup Sentry

import { Probot } from "probot";

import * as Sentry from "@sentry/node";

import { getConfig } from "./config/config";
import { createInitialPR } from "./setup/installation.created";
import { createTranslationPR } from "./translation/translation";
import { connectToDatabase } from "./db/connection";
import { upsertInstallation } from "./models/repositories/installation.repository";
import { upsertMarketplacePurchase } from "./models/repositories/marketplacePurchase.repository";
import { upsertRepository } from "./models/repositories/repository.repository";

// Create a promise to track database connection
let dbConnection: Promise<void>;

// Initialize database connection
const initDatabase = () => {
  dbConnection = connectToDatabase().catch((error) => {
    console.error("Failed to connect to database:", error);
    Sentry.captureException(error);
    process.exit(1);
  });
};

export const App = (app: Probot) => {
  initDatabase();

  app.on("installation.created", async (context) => {
    await dbConnection;
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

      // Create repo document
      await upsertRepository({
        installationId: installation.id,
        name: repo.full_name,
        isActive: true,
        action: "installation.created",
      });

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

  app.on("installation_repositories", async (context) => {
    await dbConnection;
    const installation = context.payload.installation;

    // Handle added repositories
    if (context.payload.repositories_added?.length > 0) {
      for (const repo of context.payload.repositories_added) {
        await upsertRepository({
          installationId: installation.id,
          name: repo.full_name,
          isActive: true,
          action: `repo added to installation`,
        });
      }
    }

    // Handle removed repositories
    if (context.payload.repositories_removed?.length > 0) {
      for (const repo of context.payload.repositories_removed) {
        await upsertRepository({
          installationId: installation.id,
          name: repo.full_name,
          isActive: false,
          action: `repo removed from installation`,
        });
      }
    }
  });

  app.on("pull_request.closed", async (context) => {
    await dbConnection;
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
    try {
      await dbConnection;

      const account = context.payload.marketplace_purchase.account;
      await upsertMarketplacePurchase({
        accountId: account.id,
        account: {
          type: account.type,
          node_id: account.node_id,
          login: account.login,
          organization_billing_email: account.organization_billing_email,
        },
        action: context.payload.action,
      });
      app.log.info(`Marketplace purchase saved for account ${account.login}`);
    } catch (error) {
      app.log.error("Error saving marketplace purchase:", error);
      Sentry.captureException(error);
    }
  });

  app.onError((error) => {
    app.log.error(error as Error);
    Sentry.captureException(error);
  });
};

export default App;
