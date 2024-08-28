import { Probot, ProbotOctokit } from "probot";

export const findFluentResourceFile = async (
  app: Probot,
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string
) => {
  const query = `repo:${owner}/${repo}  new FluentResource`;

  app.log.info(`Search query: ${query}`);
  try {
    const searchResponse = await octokit.rest.search.code({
      q: query,
    });

    const baseFile = searchResponse.data.items.find((item) =>
      item.name.toLowerCase().includes("en")
    );

    return baseFile?.path;
  } catch (error) {
    app.log.error(`Error searching for FluentResource file: ${error}`);
    return undefined;
  }
};
