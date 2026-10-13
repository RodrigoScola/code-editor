import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { vim, workspace } from "../harness.js";

// Running programs from the editor, as in Vim:
//   :!cmd            run cmd, show its output, leave the text alone
//   :r !cmd          put cmd's output below the cursor line (:0r above line 1)
//   :{range}!cmd     filter: send the lines to cmd's stdin, replace them with
//                    its stdout (:%!sort, :2,4!sort)
//   !{motion}        types :{range}! on the command line for the lines the
//                    motion covers (!! is the current line, !ip the paragraph)
//
// Commands run with the system shell in the workspace folder
// (ctx.setWorkspace), or the editor's working directory without one, and
// finish before the next key is handled. A failing command (exit code not
// 0) reports "shell returned N" and a filter then leaves the lines as they
// were. A filter is one undo step.
//
// The commands here are small node scripts so the specs behave the same on
// Windows and Linux.

const scripts = () =>
  workspace({
    "upper.js":
      "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(s.toUpperCase()))",
    "sort.js":
      "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(s.split('\\n').filter(Boolean).sort().join('\\n')+'\\n'))",
    "hello.js": "console.log('hello');console.log('world')",
    "cwd.js": "console.log(process.cwd())",
    "fail.js": "process.exit(3)",
  });

// the scripts are run by their full path, so only the spec about the working
// folder sets a workspace
function editor(text: string) {
  const root = scripts();
  const ide = vim(text, { width: 100, height: 20 });
  const run = (name: string) => `node "${join(root, name)}"`;
  return { ide, root, run };
}

describe(":r !cmd", () => {
  it("puts the output below the cursor line", () => {
    const { ide, run } = editor("a\n|b\nc");

    ide.keys(`:r !${run("hello.js")}<CR>`);

    expect(ide.lines()).toEqual(["a", "b", "hello", "world", "c"]);
  });

  it("moves the cursor to the first inserted line", () => {
    const { ide, run } = editor("|a\nb");

    ide.keys(`:r !${run("hello.js")}<CR>`);

    expect(ide.cursor().line).eq(1);
  });

  it(":0r puts it above the first line", () => {
    const { ide, run } = editor("a\n|b");

    ide.keys(`:0r !${run("hello.js")}<CR>`);

    expect(ide.lines()).toEqual(["hello", "world", "a", "b"]);
  });

  it("runs in the workspace folder", () => {
    const { ide, root, run } = editor("|");
    ide.setWorkspace(root);

    ide.keys(`:r !${run("cwd.js")}<CR>`);

    expect(ide.lines().map((l) => l.toLowerCase())).toContain(root.toLowerCase());
  });
});

describe(":{range}!cmd filters lines", () => {
  it(":%! replaces every line with the output", () => {
    const { ide, run } = editor("|cherry\napple\nbanana");

    ide.keys(`:%!${run("sort.js")}<CR>`);

    expect(ide.lines()).toEqual(["apple", "banana", "cherry"]);
  });

  it("a range only touches its lines", () => {
    const { ide, run } = editor("|keep\nb\na\nkeep too");

    ide.keys(`:2,3!${run("sort.js")}<CR>`);

    expect(ide.lines()).toEqual(["keep", "a", "b", "keep too"]);
  });

  it("is one undo step", () => {
    const { ide, run } = editor("|one\ntwo");

    ide.keys(`:%!${run("upper.js")}<CR>`);
    expect(ide.lines()).toEqual(["ONE", "TWO"]);

    ide.keys("u");

    expect(ide.lines()).toEqual(["one", "two"]);
  });

  it("a failing command leaves the lines alone and says so", () => {
    const { ide, run } = editor("|one\ntwo");

    ide.keys(`:%!${run("fail.js")}<CR>`);

    expect(ide.lines()).toEqual(["one", "two"]);
    expect(ide.statusLine()).toContain("shell returned 3");
  });
});

describe("!{motion}", () => {
  it("!! starts a filter for the current line", () => {
    const { ide } = editor("a\n|b\nc");

    ide.keys("!!");

    expect(ide.statusLine()).toContain(":.!");
  });

  it("!! then a command filters that line", () => {
    const { ide, run } = editor("a\n|b\nc");

    ide.keys(`!!${run("upper.js")}<CR>`);

    expect(ide.lines()).toEqual(["a", "B", "c"]);
  });

  it("!j covers two lines", () => {
    const { ide } = editor("a\n|b\nc");

    ide.keys("!j");

    expect(ide.statusLine()).toContain(":.,.+1!");
  });

  it("!ip filters the paragraph", () => {
    const { ide, run } = editor("|z\ny\n\nkeep");

    ide.keys(`!ip${run("sort.js")}<CR>`);

    expect(ide.lines()).toEqual(["y", "z", "", "keep"]);
  });
});

describe(":!cmd", () => {
  it("shows the output without changing the text", () => {
    const { ide, run } = editor("|text");

    ide.keys(`:!${run("hello.js")}<CR>`);

    expect(ide.lines()).toEqual(["text"]);
    // "world" is only in the output; "hello" is also in the command's name
    expect(ide.screen().join("\n")).toContain("world");
  });

  it("reports the exit code of a failing command", () => {
    const { ide, run } = editor("|text");

    ide.keys(`:!${run("fail.js")}<CR>`);

    expect(ide.screen().join("\n")).toContain("shell returned 3");
  });

  it(":!! runs the previous command again", () => {
    const { ide, run } = editor("|");

    ide.keys(`:r !${run("hello.js")}<CR>`);
    ide.keys(":r !!<CR>");

    expect(ide.lines().filter((l) => l === "hello")).toHaveLength(2);
  });
});
