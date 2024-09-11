import { createNodeMiddleware, createProbot } from "probot";

import { App } from "../../../src/index";

export default createNodeMiddleware(App, {
  probot: createProbot(),
  webhooksPath: "/api/github/webhooks",
});
