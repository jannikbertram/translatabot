// You can import your modules
// import index from '../src/index'

import nock from "nock";
// Requiring our app implementation
import myProbotApp, { INITIALE_BRANCH_NAME, MAIN_BRANCH } from "../src";
import { Probot, ProbotOctokit } from "probot";
// Requiring our fixtures
import payload from "./fixtures/issues.opened.json";

const TEST_REPO = "hiimbex/testing-things";

describe("My Probot app", () => {
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
    myProbotApp(probot);
  });

  test("handles installation.created event and creates a pull request", async () => {
    const baseFilePath = "path/to/en.json";

    // Mock the API call to get the content of the base file
    nock("https://api.github.com")
      .get(`/search/code?q=new%20FluentResource`)
      .reply(200, {
        items: [{ name: "en.json", path: baseFilePath }],
      });

    // Mock the API call to search for the FluentResource file
    nock("https://api.github.com")
      .get(`/repos/${TEST_REPO}/contents/${encodeURIComponent(baseFilePath)}`)
      .query(true)
      .reply(200, [{ path: baseFilePath }]);

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

    // Mock the API call to get the tree SHA of the latest commit
    nock("https://api.github.com")
      .get(`/repos/${TEST_REPO}/git/commits/main-branch-sha`)
      .reply(200, {
        tree: { sha: "tree-sha" },
      });

    // Mock the API call to create a new branch
    nock("https://api.github.com")
      .post(`/repos/${TEST_REPO}/git/refs`)
      .reply(200, {
        ref: `refs/heads/${INITIALE_BRANCH_NAME}`,
        sha: "new-branch-sha",
      });

    // Mock the API call to create a new blob
    nock("https://api.github.com")
      .post(`/repos/${TEST_REPO}/git/blobs`)
      .reply(200, { sha: "new-blob-sha" });

    // Mock the API call to create a new tree
    nock("https://api.github.com")
      .post(`/repos/${TEST_REPO}/git/trees`)
      .reply(200, { sha: "new-tree-sha" });

    // Mock the API call to create a new commit
    nock("https://api.github.com")
      .post(`/repos/${TEST_REPO}/git/commits`)
      .reply(200, { sha: "new-commit-sha" });

    // Mock the API call to update the branch reference
    nock("https://api.github.com")
      .patch(
        `/repos/${TEST_REPO}/git/refs/${encodeURIComponent(
          "heads/" + INITIALE_BRANCH_NAME
        )}`
      )
      .reply(200);

    // Mock the API call to create a pull request
    nock("https://api.github.com")
      .post(`/repos/${TEST_REPO}/pulls`)
      .reply(200, { html_url: `https://github.com/${TEST_REPO}/pull/1` });

    // Trigger the event
    await probot.receive({ name: "installation.created", payload });

    console.log(nock.pendingMocks());
    // Ensure all nocks were called
    expect(nock.isDone()).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
