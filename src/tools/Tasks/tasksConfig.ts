// tasks.json (version 2.0.0)
import type { ShellArg } from "./shellQuoting.js";

export interface TaskPresentation {
  reveal: "always" | "silent" | "never";
  revealProblems: "always" | "onProblem" | "never";
  echo: boolean;
  focus: boolean;
  panel: "shared" | "dedicated" | "new";
  showReuseMessage: boolean;
  clear: boolean;
  close: boolean;
}

export interface TaskRunOptions {
  reevaluateOnRerun: boolean;
  runOn: "default" | "folderOpen";
  instanceLimit: number;
  instancePolicy: "prompt" | "silent" | "warn" | "terminateOldest" | "terminateNewest";
}

export interface TaskGroup {
  kind: string;
  isDefault: boolean;
}

// a task with the defaults filled in
export interface Task {
  label: string;
  // "shell" | "process" or a detected type like "npm"
  type: string;
  command?: string | ShellArg;
  args: (string | ShellArg)[];
  options: {
    // defaults to "${workspaceFolder}"
    cwd: string;
    env?: Record<string, string>;
    shell?: { executable: string; args?: string[] };
  };
  group?: TaskGroup;
  isBackground: boolean;
  problemMatcher: string[];
  presentation: TaskPresentation;
  runOptions: TaskRunOptions;
  dependsOn?: string | string[];
  dependsOrder?: "parallel" | "sequence";
  hide?: boolean;
  detail?: string;
}

export interface TasksConfig {
  tasks: Task[];
  errors: string[];
}

export interface TasksConfigOptions {
  // process.platform: picks the "windows" / "linux" / "osx" section
  platform: string;
  // from the user tasks.json, added after the workspace tasks
  userTasks?: Record<string, unknown>[];
}

export function parseTasks(jsonc: string, options: TasksConfigOptions): TasksConfig {
  throw new Error("not implemented");
}

// the build task with isDefault, or the only build task
export function defaultBuildTask(tasks: Task[]): Task | undefined {
  throw new Error("not implemented");
}

// the labels shown in "Run Task": hidden ones left out
export function runTaskList(tasks: Task[]): string[] {
  throw new Error("not implemented");
}

export interface TaskDependencies {
  label: string;
  dependsOn?: string | string[];
  dependsOrder?: "parallel" | "sequence" | (string & {});
}

// stages of labels: one stage runs in parallel, stages run in order.
// Throws on a cycle or an unknown label
export function executionPlan(label: string, tasks: TaskDependencies[]): string[][] {
  throw new Error("not implemented");
}
