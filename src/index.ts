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

export const App = (app: Probot) => {
  // Create a promise to track database connection
  const dbConnection = connectToDatabase();

  app.on("installation.created", async (context) => {
    await dbConnection;
    const installation = context.payload.installation;
    const repositorySelection = installation.repository_selection;

    let repos = context.payload.repositories ?? [];
    if (repositorySelection === "all") {
      const { data } =
        await context.octokit.apps.listInstallationReposForAuthenticatedUser({
          installation_id: installation.id,
          per_page: 100,
        });
      repos = data.repositories;
    }

    // Save installation data
    await upsertInstallation(installation);

    if (repos.length === 0) {
      console.log(`No repositories found for installation ${installation.id}`);
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
        await createInitialPR({
          octokit: context.octokit,
          installationId: installation.id,
          owner,
          repo: repoName,
        });
      } catch (error) {
        console.error(error as Error);
        Sentry.captureException(error);
      }
    }
  });

  app.on("installation_repositories.added", async (context) => {
    await dbConnection;
    const installation = context.payload.installation;

    for (const repo of context.payload.repositories_added ?? []) {
      const owner = repo.full_name.split("/")[0];
      const repoName = repo.full_name.split("/")[1];

      Sentry.setUser({ id: repo.full_name, username: repo.full_name });
      Sentry.setContext("installation_repositories.added", {
        owner,
        repo: repoName,
      });

      await upsertRepository({
        installationId: installation.id,
        name: repo.full_name,
        isActive: true,
        action: `repo added to installation`,
      });

      try {
        await createInitialPR({
          octokit: context.octokit,
          installationId: installation.id,
          owner,
          repo: repoName,
        });
      } catch (error) {
        console.error(error as Error);
        Sentry.captureException(error);
      }
    }
  });

  app.on("installation_repositories.removed", async (context) => {
    await dbConnection;
    const installation = context.payload.installation;

    for (const repo of context.payload.repositories_removed ?? []) {
      await upsertRepository({
        installationId: installation.id,
        name: repo.full_name,
        isActive: false,
        action: `repo removed from installation`,
      });
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

    const installationId = context.payload.installation?.id;
    if (!installationId) {
      const error = new Error(
        "No installation ID found in pull request context"
      );
      console.error(error);
      Sentry.captureException(error, {
        level: "fatal",
      });
      return;
    }
    await createTranslationPR({
      octokit: context.octokit,
      installationId,
      config,
      owner,
      repo: repoName,
      prNumber: context.payload.pull_request.number,
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
      console.log(`Marketplace purchase saved for account ${account.login}`);
    } catch (error) {
      console.error("Error saving marketplace purchase:", error);
      Sentry.captureException(error);
    }
  });

  app.onError((error) => {
    console.error(error as Error);
    Sentry.captureException(error);
  });
};

export default App;
