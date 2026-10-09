import { describe, expect, it } from "vitest";
import { defaultBuildTask, executionPlan, parseTasks, runTaskList } from "../../../src/Tasks/tasksConfig.js";

// tasks.json (version 2.0.0). Proposed src/Tasks/tasksConfig.ts:
//   parseTasks(jsonc, { platform, userTasks? }) -> { tasks, errors }
//     a task needs a label and a type ("shell" | "process" or a detected
//     type like "npm"); command/args/options may be overridden in a
//     "windows" / "linux" / "osx" section
//     defaults filled in:
//       presentation { reveal: "always", revealProblems: "never",
//                      echo: true, focus: false, panel: "shared",
//                      showReuseMessage: true, clear: false, close: false }
//       runOptions { reevaluateOnRerun: true, runOn: "default",
//                    instanceLimit: 1, instancePolicy: "prompt" }
//       options.cwd: "${workspaceFolder}"
//       problemMatcher: always an array
//       group "build" -> { kind: "build", isDefault: false }
//     userTasks (from the user tasks.json) are added after workspace tasks
//   defaultBuildTask(tasks) -> the build task with isDefault, or the only
//     build task, or undefined
//   runTaskList(tasks) -> labels shown in "Run Task": hidden ones left out
//   executionPlan(label, tasks) -> stages: tasks in one stage run in
//     parallel, stages run in order (dependsOrder "sequence" makes one
//     stage per dependency); throws on a dependency cycle or unknown label

const json = `{
  "version": "2.0.0",
  "tasks": [
    { "label": "build", "type": "shell", "command": "npm run build", "group": { "kind": "build", "isDefault": true } },
    { "label": "lint", "type": "shell", "command": "eslint", "args": ["."], "group": "build",
      "windows": { "command": "eslint.cmd" } },
    { "label": "watch", "type": "process", "command": "tsc", "args": ["-w"], "isBackground": true,
      "problemMatcher": "$tsc-watch", "hide": true },
    { "label": "test", "type": "shell", "command": "npm test", "group": "test" }
  ]
}`;

const parsed = (platform = "linux") => parseTasks(json, { platform });
const task = (label: string, platform = "linux") =>
  parsed(platform).tasks.find((t: { label: string }) => t.label === label);

describe("parseTasks", () => {
  it("reads every task", () => {
    expect(parsed().tasks.map((t: { label: string }) => t.label)).toEqual(["build", "lint", "watch", "test"]);
    expect(parsed().errors).toEqual([]);
  });

  it("fills in presentation defaults", () => {
    expect(task("build").presentation).toEqual({
      reveal: "always",
      revealProblems: "never",
      echo: true,
      focus: false,
      panel: "shared",
      showReuseMessage: true,
      clear: false,
      close: false,
    });
  });

  it("fills in run option defaults", () => {
    expect(task("build").runOptions).toEqual({
      reevaluateOnRerun: true,
      runOn: "default",
      instanceLimit: 1,
      instancePolicy: "prompt",
    });
  });

  it("defaults the working folder to the workspace", () => {
    expect(task("build").options.cwd).eq("${workspaceFolder}");
  });

  it("turns a group name into a group object", () => {
    expect(task("lint").group).toEqual({ kind: "build", isDefault: false });
  });

  it("always gives an array of problem matchers", () => {
    expect(task("watch").problemMatcher).toEqual(["$tsc-watch"]);
    expect(task("build").problemMatcher).toEqual([]);
  });

  it("uses the platform section on that platform", () => {
    expect(task("lint", "win32").command).eq("eslint.cmd");
    expect(task("lint", "linux").command).eq("eslint");
  });

  it("reports a task without a label or type", () => {
    const { errors } = parseTasks('{ "version": "2.0.0", "tasks": [{ "command": "x" }] }', { platform: "linux" });

    expect(errors.length).toBeGreaterThan(0);
  });

  it("adds user tasks after the workspace tasks", () => {
    const { tasks } = parseTasks(json, {
      platform: "linux",
      userTasks: [{ label: "global", type: "shell", command: "echo hi" }],
    });

    expect(tasks.at(-1).label).eq("global");
  });
});

describe("defaultBuildTask", () => {
  it("is the build task marked isDefault", () => {
    expect(defaultBuildTask(parsed().tasks)?.label).eq("build");
  });

  it("is the only build task when none is marked", () => {
    const { tasks } = parseTasks('{ "version": "2.0.0", "tasks": [{ "label": "b", "type": "shell", "command": "x", "group": "build" }] }', { platform: "linux" });

    expect(defaultBuildTask(tasks)?.label).eq("b");
  });

  it("is undefined when several build tasks are unmarked", () => {
    const { tasks } = parseTasks(
      '{ "version": "2.0.0", "tasks": [{ "label": "a", "type": "shell", "command": "x", "group": "build" }, { "label": "b", "type": "shell", "command": "y", "group": "build" }] }',
      { platform: "linux" },
    );

    expect(defaultBuildTask(tasks)).toBeUndefined();
  });
});

describe("runTaskList", () => {
  it("leaves out hidden tasks", () => {
    expect(runTaskList(parsed().tasks)).toEqual(["build", "lint", "test"]);
  });
});

describe("executionPlan", () => {
  const tasks = [
    { label: "all", dependsOn: ["a", "b"] },
    { label: "ordered", dependsOn: ["a", "b"], dependsOrder: "sequence" },
    { label: "a", dependsOn: "c" },
    { label: "b" },
    { label: "c" },
  ];

  it("runs dependencies in parallel by default, after their own dependencies", () => {
    expect(executionPlan("all", tasks)).toEqual([["c"], ["a", "b"], ["all"]]);
  });

  it("sequence runs them one after another", () => {
    expect(executionPlan("ordered", tasks)).toEqual([["c"], ["a"], ["b"], ["ordered"]]);
  });

  it("a task without dependencies is one stage", () => {
    expect(executionPlan("b", tasks)).toEqual([["b"]]);
  });

  it("throws on a cycle", () => {
    expect(() =>
      executionPlan("x", [
        { label: "x", dependsOn: "y" },
        { label: "y", dependsOn: "x" },
      ]),
    ).toThrow(/cycl/i);
  });

  it("throws on an unknown dependency", () => {
    expect(() => executionPlan("x", [{ label: "x", dependsOn: "nope" }])).toThrow(/nope/);
  });
});
