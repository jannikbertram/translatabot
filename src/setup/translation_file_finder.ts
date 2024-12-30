import { ProbotOctokit } from "probot";

export const findDefaultTranslationFile = async (
  octokit: InstanceType<typeof ProbotOctokit>,
  owner: string,
  repo: string
) => {
  // Search for files containing 'en' with .ts or .json extensions
  const query = `repo:${owner}/${repo} filename:(en.ts OR en.json OR en-*.ts OR en-*.json)`;

  try {
    const searchResponse = await octokit.rest.search.code({
      q: query,
    });

    // Find the first matching English translation file
    const baseFile = searchResponse.data.items[0];

    return baseFile?.path;
  } catch (error) {
    console.error(`Error searching for English translation file: ${error}`);
    return undefined;
  }
};
