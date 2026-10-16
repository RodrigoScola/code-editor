// Running a command and reading problems from its output (VS Code tasks,
// Vim :make)
import type { Problem } from "./problemMatcher.js";

export interface RunTaskOptions {
  command: string;
  args?: string[];
  cwd?: string;
  matcher?: "tsc" | "gcc";
}

export interface RunTaskResult {
  exitCode: number;
  output: string;
  problems: Problem[];
}

export function runTask(options: RunTaskOptions): Promise<RunTaskResult> {
  throw new Error("not implemented");
}
