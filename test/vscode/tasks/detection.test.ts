import { describe, expect, it } from "vitest";
import { detectNpmTasks, detectTypeScriptTasks } from "../../../src/Tasks/detect.js";
import { workspace } from "../../ide/harness.js";

// Auto-detected tasks. Proposed src/Tasks/detect.ts:
//   detectNpmTasks(root, { exclude? }) -> [{ label, command, detail, group?,
//     folder }] one per script in each package.json (node_modules skipped)
//     label: "npm: build", or "npm: build - packages/app" outside the root
//     command: "<package manager> run <script>", the package manager from
//     the lock file: pnpm-lock.yaml -> pnpm, yarn.lock -> yarn, bun.lockb or
//     bun.lock -> bun, otherwise npm
//     detail: the script itself
//     group: scripts named build/compile/watch -> "build", test -> "test"
//     exclude: globs of folders to skip (npm.exclude)
//   detectTypeScriptTasks(root) -> for each tsconfig.json:
//     "tsc: build - tsconfig.json" and "tsc: watch - tsconfig.json"
//     (with the relative path for nested ones)

const scripts = (s: Record<string, string>) => JSON.stringify({ scripts: s });
const labels = (tasks: { label: string }[]) => tasks.map((t) => t.label);

describe("npm scripts", () => {
  it("makes a task for each script", () => {
    const root = workspace({ "package.json": scripts({ build: "tsc", test: "vitest" }) });

    expect(labels(detectNpmTasks(root, {}))).toEqual(["npm: build", "npm: test"]);
  });

  it("the command runs the script, the detail shows it", () => {
    const root = workspace({ "package.json": scripts({ build: "tsc -p ." }) });

    expect(detectNpmTasks(root, {})[0]).toMatchObject({ command: "npm run build", detail: "tsc -p ." });
  });

  it("groups build and test scripts", () => {
    const root = workspace({ "package.json": scripts({ build: "x", watch: "y", test: "z", lint: "w" }) });
    const groups = Object.fromEntries(detectNpmTasks(root, {}).map((t: { label: string; group?: string }) => [t.label, t.group]));

    expect(groups).toEqual({ "npm: build": "build", "npm: watch": "build", "npm: test": "test", "npm: lint": undefined });
  });

  it("picks the package manager from the lock file", () => {
    for (const [lock, manager] of [
      ["pnpm-lock.yaml", "pnpm"],
      ["yarn.lock", "yarn"],
      ["bun.lockb", "bun"],
      ["package-lock.json", "npm"],
    ]) {
      const root = workspace({ "package.json": scripts({ build: "x" }), [lock]: "" });
      expect(detectNpmTasks(root, {})[0].command, lock).eq(`${manager} run build`);
    }
  });

  it("names tasks from nested packages with their folder", () => {
    const root = workspace({
      "package.json": scripts({ build: "x" }),
      "packages/app/package.json": scripts({ start: "y" }),
    });

    expect(labels(detectNpmTasks(root, {}))).toEqual(["npm: build", "npm: start - packages/app"]);
  });

  it("skips node_modules and excluded folders", () => {
    const root = workspace({
      "package.json": scripts({ build: "x" }),
      "node_modules/dep/package.json": scripts({ postinstall: "y" }),
      "examples/demo/package.json": scripts({ start: "z" }),
    });

    expect(labels(detectNpmTasks(root, { exclude: ["**/examples/**"] }))).toEqual(["npm: build"]);
  });
});

describe("TypeScript", () => {
  it("offers build and watch for each tsconfig", () => {
    const root = workspace({ "tsconfig.json": "{}", "packages/lib/tsconfig.json": "{}" });

    expect(labels(detectTypeScriptTasks(root))).toEqual([
      "tsc: build - tsconfig.json",
      "tsc: watch - tsconfig.json",
      "tsc: build - packages/lib/tsconfig.json",
      "tsc: watch - packages/lib/tsconfig.json",
    ]);
  });

  it("the watch task is a background task with $tsc-watch", () => {
    const root = workspace({ "tsconfig.json": "{}" });
    const watch = detectTypeScriptTasks(root).find((t: { label: string }) => t.label.startsWith("tsc: watch"));

    expect(watch).toMatchObject({ isBackground: true, problemMatcher: ["$tsc-watch"] });
  });
});
