import { describe, expect, it } from "vitest";
import { parseLaunchConfig } from "../../../src/Debug/launchConfig.js";
import { resolveVariables } from "../../../src/Workspace/variables.js";
import { BreakpointStore } from "../../../src/Debug/breakpoints.js";
import { formatLogMessage } from "../../../src/Debug/breakpointConditions.js";
import { expressionAt } from "../../../src/Debug/views.js";

// Edge cases for debugging (base specs: launch-config, variables,
// breakpoints, session, views).

describe("launch.json", () => {
  it("an empty file has no configurations and no errors", () => {
    expect(parseLaunchConfig("", { platform: "linux" })).toMatchObject({ configurations: [], compounds: [], errors: [] });
  });

  it("two configurations with the same name are reported", () => {
    const json = '{ "configurations": [{ "type": "node", "request": "launch", "name": "A" }, { "type": "node", "request": "launch", "name": "A" }] }';

    expect(parseLaunchConfig(json, { platform: "linux" }).errors.join("\n")).toContain("A");
  });

  it("the platform section can set presentation", () => {
    const json = '{ "configurations": [{ "type": "node", "request": "launch", "name": "A", "osx": { "presentation": { "hidden": true } } }] }';

    expect(parseLaunchConfig(json, { platform: "darwin" }).configurations[0].presentation).toEqual({ hidden: true });
  });
});

describe("variables", () => {
  const ctx = {
    platform: "linux",
    workspaceFolder: "/w",
    workspaceFolders: { w: "/w" },
    userHome: "/h",
    env: { A: "x" },
    config: () => undefined,
    commands: {},
    inputs: [],
    ui: { prompt: async () => "", pick: async () => "" },
  };

  it("a value with no variables comes back unchanged", async () => {
    await expect(resolveVariables("plain $ text {}", ctx)).resolves.eq("plain $ text {}");
  });

  it("variables don't get resolved twice", async () => {
    await expect(resolveVariables("${env:A}", { ...ctx, env: { A: "${userHome}" } })).resolves.eq("${userHome}");
  });

  it("an unknown workspace folder name is an error", async () => {
    await expect(resolveVariables("${workspaceFolder:Nope}", ctx)).rejects.toThrow(/Nope/);
  });

  it("${relativeFile} for a file outside the workspace is the full path", async () => {
    await expect(resolveVariables("${relativeFile}", { ...ctx, file: "/elsewhere/a.ts" })).resolves.eq("/elsewhere/a.ts");
  });

  it("a file with no extension", async () => {
    await expect(
      resolveVariables("${fileBasenameNoExtension}|${fileExtname}", { ...ctx, file: "/w/Makefile" }),
    ).resolves.eq("Makefile|");
  });

  it("a dot file", async () => {
    await expect(resolveVariables("${fileExtname}", { ...ctx, file: "/w/.env" })).resolves.eq("");
  });
});

describe("breakpoints", () => {
  it("a logpoint with an unclosed brace keeps the brace", async () => {
    await expect(formatLogMessage("a {b", async () => "x")).resolves.eq("a {b");
  });

  it("a failing expression in a logpoint shows the error instead", async () => {
    await expect(
      formatLogMessage("v={v}", async () => {
        throw new Error("v is not defined");
      }),
    ).resolves.eq("v=v is not defined");
  });

  it("toggling an inline breakpoint off leaves the line breakpoint", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 1);
    store.toggle("a.ts", 1, { column: 5 });

    store.toggle("a.ts", 1, { column: 5 });

    expect(store.toDap("a.ts")).toEqual([{ line: 2 }]);
  });

  it("inserting lines in the middle of a file moves only breakpoints below", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 2);
    store.toggle("a.ts", 10);

    store.linesChanged("a.ts", 5, 0, 3);

    expect(store.list("a.ts").map((b: { line: number }) => b.line)).toEqual([2, 13]);
  });
});

describe("hover expressions", () => {
  it("works at the start of the line", () => {
    expect(expressionAt("value + 1", 0)).eq("value");
  });

  it("string indexes are included", () => {
    expect(expressionAt('obj["key"].x', 11)).eq('obj["key"].x');
  });
});
