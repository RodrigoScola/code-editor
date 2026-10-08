import { describe, expect, it } from "vitest";
import { TaskRunner } from "../../../src/Tasks/taskRunner.js";

// Running tasks. Proposed src/Tasks/taskRunner.ts, with terminals faked:
//   new TaskRunner({ createTerminal, diagnostics?, notify? })
//     createTerminal(name) -> { name, written: string[], write(text),
//       run(commandLine) -> process { emit(line), exit(code) }, dispose() }
//   runner.run(task) -> Promise<{ exitCode }> (a background task resolves
//     once its problem matcher's endsPattern is seen the first time)
//   runner.terminals() / runner.running() / runner.rerunLast() /
//     runner.terminate(label)
// Behavior:
//   echo writes "Executing task: <command line>" first
//   panel "shared": a finished task's terminal is reused by the next task,
//     with "Terminal will be reused by tasks, press any key to close it."
//     (showReuseMessage); "dedicated": one terminal per task, reused for
//     that task; "new": always a new terminal
//   instanceLimit with instancePolicy "terminateOldest" stops the oldest
//     run; "prompt" / "silent" / "warn" don't start a new one
//   dependsOn runs dependencies first (see executionPlan); a failing step
//     stops a sequence
//   problems found by the task's matcher go to diagnostics under the
//     matcher's owner

function fakeTerminals() {
  const created: {
    name: string;
    written: string[];
    processes: { command: string; emit: (line: string) => void; exit: (code: number) => void }[];
    disposed: boolean;
  }[] = [];
  const createTerminal = (name: string) => {
    const terminal = {
      name,
      written: [] as string[],
      processes: [] as { command: string; emit: (line: string) => void; exit: (code: number) => void }[],
      disposed: false,
      write(text: string) {
        terminal.written.push(text);
      },
      run(command: string, handlers: { onLine: (l: string) => void; onExit: (c: number) => void }) {
        const proc = { command, emit: handlers.onLine, exit: handlers.onExit };
        terminal.processes.push(proc);
        return proc;
      },
      dispose() {
        terminal.disposed = true;
      },
    };
    created.push(terminal);
    return terminal;
  };
  return { created, createTerminal };
}

const shell = (label: string, command: string, extra: object = {}) => ({
  label,
  type: "shell",
  command,
  args: [],
  presentation: { echo: true, panel: "shared", showReuseMessage: true, reveal: "always" },
  runOptions: { instanceLimit: 1, instancePolicy: "prompt" },
  problemMatcher: [],
  ...extra,
});

describe("running a task", () => {
  it("echoes the command and resolves with the exit code", async () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });

    const done = runner.run(shell("build", "npm run build"));
    created[0].processes[0].exit(0);

    await expect(done).resolves.toEqual({ exitCode: 0 });
    expect(created[0].written.join("")).toContain("Executing task: npm run build");
  });

  it("does not echo when echo is false", async () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });

    const done = runner.run(shell("build", "make", { presentation: { echo: false, panel: "shared" } }));
    created[0].processes[0].exit(0);
    await done;

    expect(created[0].written.join("")).not.toContain("Executing task");
  });
});

describe("terminal reuse", () => {
  it("shared reuses a finished task's terminal and says so", async () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });

    const first = runner.run(shell("a", "echo a"));
    created[0].processes[0].exit(0);
    await first;
    expect(created[0].written.join("")).toContain("Terminal will be reused by tasks");

    const second = runner.run(shell("b", "echo b"));
    created[0].processes[1].exit(0);
    await second;

    expect(created).toHaveLength(1);
  });

  it("new always makes a new terminal", async () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });
    const fresh = (label: string) => shell(label, "x", { presentation: { echo: true, panel: "new" } });

    const first = runner.run(fresh("a"));
    created[0].processes[0].exit(0);
    await first;
    const second = runner.run(fresh("a"));
    created[1].processes[0].exit(0);
    await second;

    expect(created).toHaveLength(2);
  });
});

describe("instance limits", () => {
  it("terminateOldest stops the running instance and starts the new one", async () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });
    const task = shell("serve", "npm start", { runOptions: { instanceLimit: 1, instancePolicy: "terminateOldest" } });

    runner.run(task);
    runner.run(task);

    expect(runner.running()).toHaveLength(1);
    expect(created.flatMap((t) => t.processes)).toHaveLength(2);
  });

  it("prompt does not start a second instance", () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });
    const task = shell("serve", "npm start");

    runner.run(task);
    runner.run(task);

    expect(created.flatMap((t) => t.processes)).toHaveLength(1);
  });
});

describe("background tasks", () => {
  it("resolve once the first compile cycle ends", async () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });
    let resolved = false;

    const started = runner
      .run(shell("watch", "tsc -w", { isBackground: true, problemMatcher: ["$tsc-watch"] }))
      .then(() => (resolved = true));
    const proc = created[0].processes[0];
    proc.emit("[10:00:00 AM] Starting compilation in watch mode...");
    await Promise.resolve();
    expect(resolved).eq(false);

    proc.emit("[10:00:02 AM] Found 0 errors. Watching for file changes.");
    await started;

    expect(resolved).eq(true);
    expect(runner.running().map((t: { label: string }) => t.label)).toEqual(["watch"]);
  });
});

describe("problems", () => {
  it("are published under the matcher's owner", async () => {
    const { created, createTerminal } = fakeTerminals();
    const published: Record<string, unknown[]> = {};
    const runner = new TaskRunner({
      createTerminal,
      diagnostics: { set: (owner: string, problems: unknown[]) => (published[owner] = problems) },
    });

    const done = runner.run(shell("tsc", "tsc", { problemMatcher: ["$tsc"] }));
    created[0].processes[0].emit("src/a.ts(1,1): error TS1: bad");
    created[0].processes[0].exit(2);
    await done;

    expect(published.typescript).toHaveLength(1);
  });
});

describe("rerun and terminate", () => {
  it("rerunLast runs the last task again", async () => {
    const { created, createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });
    const first = runner.run(shell("build", "make"));
    created[0].processes[0].exit(0);
    await first;

    runner.rerunLast();

    expect(created.flatMap((t) => t.processes).map((p) => p.command)).toEqual(["make", "make"]);
  });

  it("terminate stops a running task", () => {
    const { createTerminal } = fakeTerminals();
    const runner = new TaskRunner({ createTerminal });
    runner.run(shell("serve", "npm start"));

    runner.terminate("serve");

    expect(runner.running()).toEqual([]);
  });
});
