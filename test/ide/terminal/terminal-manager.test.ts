import { describe, expect, it } from "vitest";
import { TerminalManager, findInTerminal, formatTitle } from "../../../src/Terminal/terminalManager.js";
import { VirtualTerminal } from "../../../src/Terminal/VirtualTerminal.js";

// Managing terminals (the TERMINAL panel). Proposed
// src/Terminal/terminalManager.ts, with processes started through an
// injected spawn so no real shell is needed:
//   new TerminalManager({ spawn, settings? })
//     spawn({ cwd, env, shell, args }) -> a fake process: { write(data),
//       onData(cb), onExit(cb), kill(), hasChildProcesses?() }
//   manager.create({ cwd? }) -> instance (becomes active)
//   instance: { id, title(), rename(title), write(data), runText(text),
//     buffer: VirtualTerminal, cwd(), kill() -> "killed" | "needsConfirmation" }
//   manager.groups() -> [[instance, ...], ...]; manager.split() adds to the
//     active group; manager.unsplit(instance); manager.focusNextGroup() /
//     focusPreviousGroup() (wrap around); manager.active()
//   settings: tabs.title / tabs.description templates, splitCwd
//     ("workspaceRoot" | "initial" | "inherited"), autoReplies,
//     confirmOnKill, showExitAlert, hideOnLastClosed
//   formatTitle(template, values, separator) -> ${...} variables filled in;
//     ${separator} only shows between non-empty parts
//   findInTerminal(term, query, { caseSensitive?, regex?, wholeWord? })
//     -> [{ row, column, length }], searching wrapped rows as one line

function fakeSpawn() {
  const spawned: { options: Record<string, unknown>; written: string[]; emit: (d: string) => void; exit: (code: number) => void; children: boolean }[] = [];
  const spawn = (options: Record<string, unknown>) => {
    let onData: (d: string) => void = () => {};
    let onExit: (code: number) => void = () => {};
    const proc = {
      options,
      written: [] as string[],
      children: false,
      emit: (d: string) => onData(d),
      exit: (code: number) => onExit(code),
      write(data: string) {
        proc.written.push(data);
      },
      onData(cb: (d: string) => void) {
        onData = cb;
      },
      onExit(cb: (code: number) => void) {
        onExit = cb;
      },
      kill() {},
      hasChildProcesses() {
        return proc.children;
      },
    };
    spawned.push(proc);
    return proc;
  };
  return { spawn, spawned };
}

describe("creating and grouping", () => {
  it("create makes an active terminal in its own group", () => {
    const { spawn } = fakeSpawn();
    const manager = new TerminalManager({ spawn });

    const first = manager.create();
    const second = manager.create();

    expect(manager.groups()).toEqual([[first], [second]]);
    expect(manager.active()).toBe(second);
  });

  it("split adds to the active group", () => {
    const { spawn } = fakeSpawn();
    const manager = new TerminalManager({ spawn });
    const first = manager.create();

    const split = manager.split();

    expect(manager.groups()).toEqual([[first, split]]);
  });

  it("unsplit moves a terminal into its own group", () => {
    const { spawn } = fakeSpawn();
    const manager = new TerminalManager({ spawn });
    const first = manager.create();
    const split = manager.split();

    manager.unsplit(split);

    expect(manager.groups()).toEqual([[first], [split]]);
  });

  it("focusNextGroup and focusPreviousGroup wrap around", () => {
    const { spawn } = fakeSpawn();
    const manager = new TerminalManager({ spawn });
    const a = manager.create();
    const b = manager.create();

    manager.focusNextGroup();
    expect(manager.active()).toBe(a);

    manager.focusPreviousGroup();
    expect(manager.active()).toBe(b);
  });

  it("killing the last terminal of a group removes the group", () => {
    const { spawn } = fakeSpawn();
    const manager = new TerminalManager({ spawn });
    const a = manager.create();
    const b = manager.create();

    b.kill();

    expect(manager.groups()).toEqual([[a]]);
  });

  it("hides the panel when the last terminal closes", () => {
    const { spawn } = fakeSpawn();
    const manager = new TerminalManager({ spawn, settings: { hideOnLastClosed: true } });
    manager.create().kill();

    expect(manager.panelVisible()).eq(false);
  });
});

describe("working directory of splits", () => {
  it("workspaceRoot starts splits in the workspace", () => {
    const { spawn, spawned } = fakeSpawn();
    const manager = new TerminalManager({ spawn, settings: { splitCwd: "workspaceRoot", workspaceRoot: "/p" } });
    manager.create({ cwd: "/p/src" });

    manager.split();

    expect(spawned[1].options.cwd).eq("/p");
  });

  it("initial uses the parent terminal's starting directory", () => {
    const { spawn, spawned } = fakeSpawn();
    const manager = new TerminalManager({ spawn, settings: { splitCwd: "initial", workspaceRoot: "/p" } });
    manager.create({ cwd: "/p/src" });

    manager.split();

    expect(spawned[1].options.cwd).eq("/p/src");
  });

  it("inherited uses the parent terminal's current directory", () => {
    const { spawn, spawned } = fakeSpawn();
    const manager = new TerminalManager({ spawn, settings: { splitCwd: "inherited", workspaceRoot: "/p" } });
    manager.create({ cwd: "/p" });
    spawned[0].emit("\x1b]633;P;Cwd=/p/deep\x07");

    manager.split();

    expect(spawned[1].options.cwd).eq("/p/deep");
  });
});

describe("titles", () => {
  it("formatTitle fills in variables", () => {
    expect(formatTitle("${process} in ${cwdFolder}", { process: "bash", cwdFolder: "src" }, " - ")).eq("bash in src");
  });

  it("${separator} only appears between non-empty parts", () => {
    expect(formatTitle("${process}${separator}${task}", { process: "bash", task: "" }, " - ")).eq("bash");
    expect(formatTitle("${process}${separator}${task}", { process: "bash", task: "build" }, " - ")).eq("bash - build");
  });

  it("the shell's title (OSC 0) is ${sequence}", () => {
    const { spawn, spawned } = fakeSpawn();
    const manager = new TerminalManager({ spawn, settings: { tabsTitle: "${sequence}" } });
    const terminal = manager.create();

    spawned[0].emit("\x1b]0;vim notes.txt\x07");

    expect(terminal.title()).eq("vim notes.txt");
  });

  it("rename fixes the title", () => {
    const { spawn, spawned } = fakeSpawn();
    const manager = new TerminalManager({ spawn, settings: { tabsTitle: "${sequence}" } });
    const terminal = manager.create();

    terminal.rename("server");
    spawned[0].emit("\x1b]0;other\x07");

    expect(terminal.title()).eq("server");
  });
});

describe("sending text", () => {
  it("runText sends the text and Enter", () => {
    const { spawn, spawned } = fakeSpawn();
    const terminal = new TerminalManager({ spawn }).create();

    terminal.runText("npm test");

    expect(spawned[0].written.join("")).eq("npm test\r");
  });

  it("runText uses bracketed paste for several lines when the shell asked for it", () => {
    const { spawn, spawned } = fakeSpawn();
    const terminal = new TerminalManager({ spawn }).create();
    spawned[0].emit("\x1b[?2004h");

    terminal.runText("a\nb");

    expect(spawned[0].written.join("")).eq("\x1b[200~a\rb\x1b[201~\r");
  });

  it("auto replies answer an exact prompt once each time it appears", () => {
    const { spawn, spawned } = fakeSpawn();
    new TerminalManager({ spawn, settings: { autoReplies: { "Terminate batch job (Y/N)?": "Y\r" } } }).create();

    spawned[0].emit("Terminate batch job (Y/N)? ");

    expect(spawned[0].written).toEqual(["Y\r"]);
  });
});

describe("closing", () => {
  it("asks before killing a terminal that is running something (confirmOnKill)", () => {
    const { spawn, spawned } = fakeSpawn();
    const terminal = new TerminalManager({ spawn, settings: { confirmOnKill: "always" } }).create();
    spawned[0].children = true;

    expect(terminal.kill()).eq("needsConfirmation");
  });

  it("kills right away when nothing is running", () => {
    const { spawn } = fakeSpawn();
    const terminal = new TerminalManager({ spawn, settings: { confirmOnKill: "always" } }).create();

    expect(terminal.kill()).eq("killed");
  });

  it("reports a non-zero exit code with showExitAlert", () => {
    const { spawn, spawned } = fakeSpawn();
    const manager = new TerminalManager({ spawn, settings: { showExitAlert: true } });
    manager.create();

    spawned[0].exit(2);

    expect(manager.messages().at(-1)).toContain("exit code: 2");
  });
});

describe("findInTerminal", () => {
  it("finds every match with its position", () => {
    const term = new VirtualTerminal(20, 3);
    term.write("foo bar\r\nbar foo");

    expect(findInTerminal(term, "foo", {})).toEqual([
      { row: 0, column: 0, length: 3 },
      { row: 1, column: 4, length: 3 },
    ]);
  });

  it("ignores case unless asked", () => {
    const term = new VirtualTerminal(20, 2);
    term.write("Foo foo");

    expect(findInTerminal(term, "foo", {})).toHaveLength(2);
    expect(findInTerminal(term, "foo", { caseSensitive: true })).toHaveLength(1);
  });

  it("supports regex and whole words", () => {
    const term = new VirtualTerminal(20, 2);
    term.write("a1 b22 foods food");

    expect(findInTerminal(term, "\\d+", { regex: true })).toHaveLength(2);
    expect(findInTerminal(term, "food", { wholeWord: true })).toHaveLength(1);
  });

  it("finds a match across a wrapped row", () => {
    const term = new VirtualTerminal(4, 3);
    term.write("xxhello");

    expect(findInTerminal(term, "hello", {})).toEqual([{ row: 0, column: 2, length: 5 }]);
  });
});
