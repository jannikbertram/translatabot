import { Probot } from "probot";

import { createInitialPR } from "./installation.created";

export const App = (app: Probot) => {
  app.on("installation.created", async (context) => {
    const repos = context.payload.repositories ?? [];

    for (const repo of repos) {
      const owner = repo.full_name.split("/")[0];
      const repoName = repo.full_name.split("/")[1];

      await createInitialPR(app, context.octokit, owner, repoName);
    }
  });

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    await context.octokit.issues.createComment(issueComment);
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

export default App;
