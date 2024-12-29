import nock from "nock";
import { Probot, ProbotOctokit } from "probot";

import { App } from "../src";
import { INITIAL_BRANCH_NAME } from "../src/setup/installation.created";
import { getInstallation } from "../src/models/repositories/installation.repository";
import { disconnectFromDatabase } from "../src/db/connection";
import payload from "./fixtures/installation.created.json";
import { getRepositoriesByInstallationId } from "../src/models/repositories/repository.repository";

const MAIN_BRANCH = "main";

const TEST_REPO = "jannikbertram/translatable-project";

describe("Translatabot tests", () => {
  let probot: any;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      githubToken: "test",
      // Disable throttling & retrying requests for easier testing
      Octokit: ProbotOctokit.defaults((instanceOptions: any) => {
        return {
          ...instanceOptions,
          retry: { enabled: false },
          throttle: { enabled: false },
        };
      }),
    });
    App(probot);
  });

  test("handles installation.created event and creates a pull request", async () => {
    const baseFilePath = "path/to/en.json";
    const configFilePath = ".github/translatabot.yml";

    // Mock the API call to get the default branch
    nock("https://api.github.com")
      .persist()
      .get(`/repos/${TEST_REPO}`)
      .reply(200, { default_branch: MAIN_BRANCH });

    // Mock the API call to get the content of the base file
    nock("https://api.github.com")
      .get("/search/code")
      .query(true)
      .reply(200, {
        items: [{ name: "en.json", path: baseFilePath }],
      });

    // Mock the API call to get the content of the base file
    nock("https://api.github.com")
      .put(`/repos/${TEST_REPO}/contents/${encodeURIComponent(configFilePath)}`)
      .reply(200);

    // Mock the API call to get the latest commit SHA of the main branch
    nock("https://api.github.com")
      .get(
        `/repos/${TEST_REPO}/git/ref/${encodeURIComponent(
          "heads/" + MAIN_BRANCH
        )}`
      )
      .reply(200, {
        object: { sha: "main-branch-sha" },
      });

    // Mock the API call to create a new branch
    nock("https://api.github.com")
      .post(`/repos/${TEST_REPO}/git/refs`)
      .reply(200, {
        ref: `refs/heads/${INITIAL_BRANCH_NAME}`,
        sha: "new-branch-sha",
      });

    // Mock the API call to create a pull request
    nock("https://api.github.com")
      .post(`/repos/${TEST_REPO}/pulls`)
      .reply(200, { html_url: `https://github.com/${TEST_REPO}/pull/1` });

    // Trigger the event
    await probot.receive({ name: "installation.created", payload });
    const installation = await getInstallation(payload.installation.id);
    const repositories = await getRepositoriesByInstallationId(
      payload.installation.id
    );
    const pendingMocks = nock.pendingMocks();
    if (pendingMocks.length > 0) {
      console.log(nock.pendingMocks());
    }
    expect(installation).toBeTruthy();
    expect(repositories.length).toBe(1);
    // Ensure all nocks were called
    expect(nock.isDone()).toBe(true);
  });

  afterEach(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    await disconnectFromDatabase();
  });
});
