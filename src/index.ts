import { Probot } from "probot";

import { createInitialPR } from "./setup/installation.created";
import { createTranslationPR } from "./translation/translation";
import { getConfig } from "./config/config";

export const App = (app: Probot) => {
  app.on("installation.created", async (context) => {
    const repos = context.payload.repositories ?? [];

    for (const repo of repos) {
      const owner = repo.full_name.split("/")[0];
      const repoName = repo.full_name.split("/")[1];

      await createInitialPR(app, context.octokit, owner, repoName);
    }
  });

  app.on("pull_request.closed", async (context) => {
    // only consider merged pull requests
    if (!context.payload.pull_request.merged) return;

    const repo = context.payload.repository;
    const owner = repo.full_name.split("/")[0];
    const repoName = repo.full_name.split("/")[1];

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
      baseBranch: context.payload.pull_request.base.ref,
    });
  });
};

export default App;
