import { describe, expect, it } from "vitest";
import { dropdownEntries, parseLaunchConfig } from "../../../src/Debug/launchConfig.js";

// launch.json. Proposed src/Debug/launchConfig.ts:
//   parseLaunchConfig(jsonc, { platform, userLaunch? }) -> { configurations,
//     compounds, errors }
//     every configuration needs type, request and name (else an error)
//     a "windows" / "linux" / "osx" section is merged over the
//     configuration on that platform; "type" can't be changed there
//     compounds list configuration names (or { folder, name }); unknown
//     names are errors; stopAll defaults to false
//     userLaunch: the "launch" user setting, added after the workspace ones
//   dropdownEntries(parsed) -> names in the Run and Debug dropdown:
//     hidden ones (presentation.hidden) left out, sorted by
//     presentation.group, then presentation.order, then name; entries with
//     no group come after the grouped ones; compounds included

const json = `{
  // comments are fine
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Run",
      "program": "\${workspaceFolder}/index.js",
      "windows": { "program": "\${workspaceFolder}\\\\index.js", "type": "chrome" },
      "presentation": { "group": "b", "order": 2 }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach",
      "presentation": { "group": "a" }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Hidden",
      "presentation": { "hidden": true }
    }
  ],
  "compounds": [
    { "name": "Both", "configurations": ["Run", "Attach"], "stopAll": true }
  ]
}`;

describe("parseLaunchConfig", () => {
  it("reads the configurations", () => {
    const { configurations, errors } = parseLaunchConfig(json, { platform: "linux" });

    expect(errors).toEqual([]);
    expect(configurations.map((c: { name: string }) => c.name)).toEqual(["Run", "Attach", "Hidden"]);
  });

  it("merges the platform section on that platform", () => {
    const [run] = parseLaunchConfig(json, { platform: "win32" }).configurations;

    expect(run.program).eq("${workspaceFolder}\\index.js");
  });

  it("does not let the platform section change the type", () => {
    const [run] = parseLaunchConfig(json, { platform: "win32" }).configurations;

    expect(run.type).eq("node");
  });

  it("ignores other platforms' sections", () => {
    const [run] = parseLaunchConfig(json, { platform: "linux" }).configurations;

    expect(run.program).eq("${workspaceFolder}/index.js");
  });

  it("reports a configuration without a type, request or name", () => {
    const { errors } = parseLaunchConfig('{ "configurations": [{ "name": "x" }] }', { platform: "linux" });

    expect(errors.join("\n")).toMatch(/type/);
  });

  it("reads compounds, with stopAll", () => {
    const { compounds } = parseLaunchConfig(json, { platform: "linux" });

    expect(compounds).toEqual([
      expect.objectContaining({ name: "Both", configurations: ["Run", "Attach"], stopAll: true }),
    ]);
  });

  it("reports a compound naming a configuration that doesn't exist", () => {
    const bad = '{ "configurations": [], "compounds": [{ "name": "C", "configurations": ["Nope"] }] }';

    expect(parseLaunchConfig(bad, { platform: "linux" }).errors.join("\n")).toContain("Nope");
  });

  it("adds configurations from the user launch setting", () => {
    const { configurations } = parseLaunchConfig(json, {
      platform: "linux",
      userLaunch: { configurations: [{ type: "node", request: "launch", name: "Global" }] },
    });

    expect(configurations.map((c: { name: string }) => c.name)).toContain("Global");
  });
});

describe("dropdownEntries", () => {
  it("leaves out hidden ones and sorts by group, order and name", () => {
    expect(dropdownEntries(parseLaunchConfig(json, { platform: "linux" }))).toEqual(["Attach", "Run", "Both"]);
  });
});
