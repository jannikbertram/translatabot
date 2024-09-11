import {
  DEFAULT_PATH_COMMENT,
  defaultConfigYaml,
  LANGUAGE_COMMENT,
  RELATIVE_PATH_COMMENT,
} from "../../src/config/config";

describe("Test config functions", () => {
  test("creates default config", async () => {
    const baseFilePath = "path/to/en.json";

    const actual = defaultConfigYaml(baseFilePath, "utf8");

    const expected = `version: 1
defaultPath: path/to/en.json #${DEFAULT_PATH_COMMENT}
languages:
  - relativePath: de.ts #${RELATIVE_PATH_COMMENT}
    language: German #${LANGUAGE_COMMENT}
`;

    expect(actual).toEqual(expected);
  });
});
