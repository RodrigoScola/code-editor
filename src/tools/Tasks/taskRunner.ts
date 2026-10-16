// Running tasks in terminals
import type { MatchedProblem } from "./problemMatcher.js";
import type { ShellArg } from "./shellQuoting.js";

export interface TaskProcessHandlers {
  onLine(line: string): void;
  onExit(code: number): void;
}

export interface TaskTerminal {
  name: string;
  write(text: string): void;
  run(commandLine: string, handlers: TaskProcessHandlers): unknown;
  dispose(): void;
}

export interface TaskRunnerOptions {
  createTerminal(name: string): TaskTerminal;
  // problems found by a task's matcher, under the matcher's owner
  diagnostics?: { set(owner: string, problems: MatchedProblem[]): void };
  notify?(message: string): void;
}

// what run() needs of a task; a parsed Task (tasksConfig.ts) is one
export interface RunnableTask {
  label: string;
  type?: string;
  command?: string | ShellArg;
  args?: (string | ShellArg)[];
  isBackground?: boolean;
  problemMatcher?: string[];
  presentation?: {
    echo?: boolean;
    panel?: "shared" | "dedicated" | "new" | (string & {});
    showReuseMessage?: boolean;
    reveal?: string;
  };
  runOptions?: {
    instanceLimit?: number;
    instancePolicy?: "prompt" | "silent" | "warn" | "terminateOldest" | (string & {});
  };
}

export class TaskRunner {
  constructor(options: TaskRunnerOptions) {}

  // a background task resolves once its matcher's endsPattern is first seen
  run(task: RunnableTask): Promise<{ exitCode: number }> {
    throw new Error("not implemented");
  }

  terminals(): TaskTerminal[] {
    throw new Error("not implemented");
  }

  running(): RunnableTask[] {
    throw new Error("not implemented");
  }

  rerunLast(): Promise<{ exitCode: number }> | undefined {
    throw new Error("not implemented");
  }

  terminate(label: string): void {
    throw new Error("not implemented");
  }
}
