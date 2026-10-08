import { describe, expect, it } from "vitest";
import { executionPlan, parseTasks } from "../../../src/Tasks/tasksConfig.js";
import { buildCommandLine } from "../../../src/Tasks/shellQuoting.js";
import { ProblemMatcher } from "../../../src/Tasks/problemMatcher.js";

// Edge cases for tasks (base specs: tasks-config, shell-quoting,
// problem-matchers, detection, runner).

describe("tasks.json", () => {
  it("an older version is reported", () => {
    expect(parseTasks('{ "version": "0.1.0", "tasks": [] }', { platform: "linux" }).errors.join("\n")).toContain("2.0.0");
  });

  it("two tasks with the same label are reported", () => {
    const json = '{ "version": "2.0.0", "tasks": [{ "label": "a", "type": "shell", "command": "x" }, { "label": "a", "type": "shell", "command": "y" }] }';

    expect(parseTasks(json, { platform: "linux" }).errors.join("\n")).toContain("a");
  });

  it("presentation settings merge with the defaults", () => {
    const json = '{ "version": "2.0.0", "tasks": [{ "label": "a", "type": "shell", "command": "x", "presentation": { "reveal": "never" } }] }';

    expect(parseTasks(json, { platform: "linux" }).tasks[0].presentation).toMatchObject({ reveal: "never", echo: true });
  });

  it("a task can depend on the same task through two paths without running it twice", () => {
    const tasks = [
      { label: "top", dependsOn: ["a", "b"] },
      { label: "a", dependsOn: "shared" },
      { label: "b", dependsOn: "shared" },
      { label: "shared" },
    ];

    expect(executionPlan("top", tasks).flat().filter((label: string) => label === "shared")).toHaveLength(1);
  });

  it("a task depending on itself is a cycle", () => {
    expect(() => executionPlan("a", [{ label: "a", dependsOn: "a" }])).toThrow(/cycl/i);
  });
});

describe("quoting", () => {
  it("an empty argument is quoted so it isn't lost", () => {
    expect(buildCommandLine("echo", [{ value: "", quoting: "strong" }], "bash")).eq("echo ''");
  });

  it("strong quoting in bash can't hold a single quote, so it is closed and escaped", () => {
    expect(buildCommandLine("echo", [{ value: "it's", quoting: "strong" }], "bash")).eq("echo 'it'\\''s'");
  });

  it("escape in bash handles several special characters", () => {
    expect(buildCommandLine("echo", [{ value: "a b&c", quoting: "escape" }], "bash")).eq("echo a\\ b\\&c");
  });
});

describe("problem matchers", () => {
  it("a loop pattern stops at the first line that doesn't match", () => {
    const matcher = new ProblemMatcher(
      {
        owner: "t",
        fileLocation: "absolute",
        pattern: [
          { regexp: "^(/\\S+)$", file: 1 },
          { regexp: "^\\s+(\\d+): (.*)$", line: 1, message: 2, loop: true },
        ],
      },
      { workspaceFolder: "/p" },
    );

    for (const line of ["/p/a.js", "  1: one", "  2: two", "other output", "  3: not part of a.js"]) {
      matcher.processLine(line);
    }

    expect(matcher.problems()).toHaveLength(2);
  });

  it("a line number of 0 is treated as line 1", () => {
    const matcher = new ProblemMatcher(
      { owner: "t", fileLocation: "absolute", pattern: { regexp: "^(.*):(\\d+): (.*)$", file: 1, line: 2, message: 3 } },
      { workspaceFolder: "/p" },
    );
    matcher.processLine("/p/a.ts:0: whole file");

    expect(matcher.problems()[0].startLine).eq(0);
  });

  it("Windows paths with backslashes are kept as they are with absolute", () => {
    const matcher = new ProblemMatcher(
      { owner: "t", fileLocation: "absolute", pattern: { regexp: "^(.*)\\((\\d+)\\): (.*)$", file: 1, line: 2, message: 3 } },
      { workspaceFolder: "C:\\p" },
    );
    matcher.processLine("C:\\p\\a.cs(3): m");

    expect(matcher.problems()[0].path).eq("C:\\p\\a.cs");
  });
});
