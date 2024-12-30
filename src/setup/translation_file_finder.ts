import { ProbotOctokit } from "probot";

export const findFluentResourceFile = async (
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string
) => {
  const query = `repo:${owner}/${repo} new FluentResource`;

  console.log(`Search query: ${query}`);
  try {
    const searchResponse = await octokit.rest.search.code({
      q: query,
    });

    console.log("Search response:", searchResponse.data.items);

    const baseFile = searchResponse.data.items.find((item) =>
      item.name.toLowerCase().includes("en")
    );

    return baseFile?.path;
  } catch (error) {
    console.error(`Error searching for FluentResource file: ${error}`);
    return undefined;
  }
};
