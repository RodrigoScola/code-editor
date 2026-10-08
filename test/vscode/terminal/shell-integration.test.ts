import { describe, expect, it } from "vitest";
import { VirtualTerminal } from "../../../src/Terminal/VirtualTerminal.js";
import {
  ShellIntegration,
  parseHistoryFile,
} from "../../../src/Terminal/shellIntegration.js";

// Shell integration: the shell marks its prompt and commands with escape
// sequences, and the terminal learns where each command starts and ends,
// its exit code and the working directory. Proposed
// src/Terminal/shellIntegration.ts:
//   new ShellIntegration(term, { nonce? })  (term: VirtualTerminal)
//   si.commands() -> [{ command, exitCode?, cwd?, promptLine, outputStart,
//     outputEnd }] finished commands, oldest first
//   si.cwd()
//   si.quality() -> "none" | "basic" | "rich"
//   si.decoration(command) -> "success" | "error" | "default" (no exit code)
//   si.output(command) -> the command's output lines
//   si.previousCommand(line) / si.nextCommand(line) -> command whose prompt
//     is before / after the line (Ctrl+Up / Ctrl+Down)
//   si.recentCommands() / si.recentDirectories() -> newest first, no repeats
//   parseHistoryFile(text, "bash" | "zsh" | "fish") -> commands, oldest first
//
// Sequences (OSC = ESC ], ending in BEL or ESC \):
//   633;A prompt start  633;B prompt end  633;C command output starts
//   633;D[;exit code] command finished   633;E;<command line>[;nonce]
//   633;P;Cwd=<path>    and the same A/B/C/D under 133 (FinalTerm)
//   1337;CurrentDir=<path> (iTerm2)       7;file://host/path (URL encoded)
// In 633;E, ";" is written \x3b and "\" as \\.

const OSC = "\x1b]";
const BEL = "\x07";
const seq = (body: string) => `${OSC}${body}${BEL}`;

function shell() {
  const term = new VirtualTerminal(40, 20);
  const si = new ShellIntegration(term);
  return { term, si };
}

// a prompt, a typed command, its output and the exit code, the way bash
// with VS Code's shell integration script writes it
function run(term: VirtualTerminal, command: string, output: string, exitCode: number) {
  term.write(seq("633;A") + "$ " + seq("633;B") + command + "\r\n");
  term.write(seq(`633;E;${command}`) + seq("633;C") + output + "\r\n");
  term.write(seq(`633;D;${exitCode}`));
}

describe("command detection", () => {
  it("records a finished command with its exit code", () => {
    const { term, si } = shell();

    run(term, "ls", "a.txt", 0);

    expect(si.commands()).toHaveLength(1);
    expect(si.commands()[0]).toMatchObject({ command: "ls", exitCode: 0 });
  });

  it("decorates by exit code", () => {
    const { term, si } = shell();
    run(term, "true", "", 0);
    run(term, "false", "", 1);

    expect(si.commands().map((c: unknown) => si.decoration(c))).toEqual(["success", "error"]);
  });

  it("D without an exit code gets the default decoration", () => {
    const { term, si } = shell();
    term.write(seq("633;A") + "$ " + seq("633;B") + "x\r\n" + seq("633;C") + seq("633;D"));

    expect(si.decoration(si.commands()[0])).eq("default");
  });

  it("knows the command's output", () => {
    const { term, si } = shell();

    run(term, "echo hi", "hi", 0);

    expect(si.output(si.commands()[0])).toEqual(["hi"]);
  });

  it("unescapes the command line in E", () => {
    const { term, si } = shell();
    term.write(seq("633;A") + seq("633;B") + seq("633;E;echo a\\x3bb \\\\ c") + seq("633;C") + seq("633;D;0"));

    expect(si.commands()[0].command).eq("echo a;b \\ c");
  });

  it("ignores an E with the wrong nonce", () => {
    const term = new VirtualTerminal(40, 20);
    const si = new ShellIntegration(term, { nonce: "secret" });

    term.write(seq("633;A") + "$ " + seq("633;B") + "real\r\n");
    term.write(seq("633;E;fake;wrong") + seq("633;C") + seq("633;D;0"));

    expect(si.commands()[0].command).eq("real");
  });

  it("works with the FinalTerm 133 sequences", () => {
    const { term, si } = shell();
    term.write(seq("133;A") + "$ " + seq("133;B") + "ls\r\n" + seq("133;C") + "x\r\n" + seq("133;D;2"));

    expect(si.commands()[0]).toMatchObject({ command: "ls", exitCode: 2 });
  });
});

describe("quality", () => {
  it("none before any sequence", () => {
    expect(shell().si.quality()).eq("none");
  });

  it("basic with only prompt and command marks", () => {
    const { term, si } = shell();
    term.write(seq("133;A") + seq("133;B") + seq("133;C") + seq("133;D;0"));

    expect(si.quality()).eq("basic");
  });

  it("rich with VS Code's own sequences", () => {
    const { term, si } = shell();
    run(term, "ls", "", 0);

    expect(si.quality()).eq("rich");
  });
});

describe("working directory", () => {
  it("from 633;P;Cwd", () => {
    const { term, si } = shell();
    term.write(seq("633;P;Cwd=/home/me/project"));

    expect(si.cwd()).eq("/home/me/project");
  });

  it("from iTerm2's 1337;CurrentDir", () => {
    const { term, si } = shell();
    term.write(seq("1337;CurrentDir=/tmp"));

    expect(si.cwd()).eq("/tmp");
  });

  it("from OSC 7, URL decoded", () => {
    const { term, si } = shell();
    term.write(seq("7;file://myhost/home/me/my%20project"));

    expect(si.cwd()).eq("/home/me/my project");
  });

  it("a command remembers the directory it ran in", () => {
    const { term, si } = shell();
    term.write(seq("633;P;Cwd=/a"));
    run(term, "ls", "", 0);

    expect(si.commands()[0].cwd).eq("/a");
  });
});

describe("navigation", () => {
  it("previousCommand and nextCommand move between prompts", () => {
    const { term, si } = shell();
    run(term, "one", "1", 0);
    run(term, "two", "2", 0);
    run(term, "three", "3", 0);
    const [one, two, three] = si.commands();

    expect(si.previousCommand(three.promptLine)).toBe(two);
    expect(si.nextCommand(one.promptLine)).toBe(two);
    expect(si.previousCommand(one.promptLine)).toBeUndefined();
  });
});

describe("recent commands and directories", () => {
  it("lists commands newest first without repeats", () => {
    const { term, si } = shell();
    run(term, "ls", "", 0);
    run(term, "git status", "", 0);
    run(term, "ls", "", 0);

    expect(si.recentCommands()).toEqual(["ls", "git status"]);
  });

  it("lists directories the same way", () => {
    const { term, si } = shell();
    term.write(seq("633;P;Cwd=/a") + seq("633;P;Cwd=/b") + seq("633;P;Cwd=/a"));

    expect(si.recentDirectories()).toEqual(["/a", "/b"]);
  });
});

describe("parseHistoryFile", () => {
  it("reads bash history", () => {
    expect(parseHistoryFile("ls\ngit status\n", "bash")).toEqual(["ls", "git status"]);
  });

  it("reads zsh extended history", () => {
    expect(parseHistoryFile(": 1700000000:0;ls\n: 1700000001:0;make test\n", "zsh")).toEqual(["ls", "make test"]);
  });

  it("reads fish history", () => {
    expect(parseHistoryFile("- cmd: ls\n  when: 1700000000\n- cmd: echo hi\n  when: 1700000001\n", "fish")).toEqual([
      "ls",
      "echo hi",
    ]);
  });
});
