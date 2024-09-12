import "./instrument"; // setup Sentry

import { Probot } from "probot";

import * as Sentry from "@sentry/node";

import { getConfig } from "./config/config";
import { createInitialPR } from "./setup/installation.created";
import { createTranslationPR } from "./translation/translation";

export const App = (app: Probot) => {
  app.on("installation.created", async (context) => {
    const repos = context.payload.repositories ?? [];

    for (const repo of repos) {
      const owner = repo.full_name.split("/")[0];
      const repoName = repo.full_name.split("/")[1];

      Sentry.setUser({ id: repo.full_name, username: repo.full_name });
      Sentry.setContext("installation.created", { owner, repo: repoName });

      try {
        await createInitialPR(app, context.octokit, owner, repoName);
      } catch (error) {
        // don't throw an error here to allow other installations to go through
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

  app.onError((error) => {
    app.log.error(error as Error);
    Sentry.captureException(error);
  });
};

export default App;
