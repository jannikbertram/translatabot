import { ProbotOctokit } from "probot";

export const findFluentResourceFile = async (
  octokit: InstanceType<typeof ProbotOctokit>
) => {
  const searchResponse = await octokit.search.code({
    q: "new FluentResource",
  });

  const baseFile = searchResponse.data.items.find((item) =>
    item.name.toLowerCase().includes("en")
  );

  return baseFile?.path;
};
