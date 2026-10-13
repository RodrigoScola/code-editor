import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findTodos, scanTodos } from "../../../src/tools/todos.js";
import { code, workspace } from "../harness.js";

// Finding TODO comments (the "Todo Tree" / todo-comments tools).
// Proposed module src/tools/todos.ts:
//
//   findTodos(text, { tags? }) -> [{ line, column, tag, author?, text }]
//     tags default to TODO FIXME HACK NOTE XXX BUG, matched as whole words in
//     capitals, followed by ":" or "(author):" or a space. line and column
//     are 0-based and point at the tag. text is what follows, trimmed.
//   scanTodos(root, { tags?, exclude? }) -> Promise of
//     [{ path, line, column, tag, author?, text }]
//     path is relative to root with "/" separators, files sorted by path,
//     todos in line order. Skips .git and node_modules, what .gitignore
//     ignores, the exclude globs, and binary files.
//
// Commands:
//   todos.next / todos.previous   move the cursor to the next / previous
//                                 todo in the file, wrapping around

describe("findTodos", () => {
  it("finds a tag and the text after it", () => {
    expect(findTodos("// TODO: write this")).toEqual([
      { line: 0, column: 3, tag: "TODO", text: "write this" },
    ]);
  });

  it("finds every default tag", () => {
    const text = ["// FIXME a", "# HACK b", "/* NOTE c */", "-- XXX d", "// BUG e"].join("\n");

    expect(findTodos(text).map((t) => t.tag)).toEqual(["FIXME", "HACK", "NOTE", "XXX", "BUG"]);
  });

  it("reads an author in brackets", () => {
    expect(findTodos("// TODO(ana): ship it")[0]).toMatchObject({
      tag: "TODO",
      author: "ana",
      text: "ship it",
    });
  });

  it("the colon is optional", () => {
    expect(findTodos("// TODO ship it")[0].text).eq("ship it");
  });

  it("drops the end of a block comment from the text", () => {
    expect(findTodos("/* TODO: inline */ code()")[0].text).eq("inline");
  });

  it("only whole words in capitals", () => {
    expect(findTodos("todo: no\nTODOS no\nmyTODO no\nNOTED no")).toEqual([]);
  });

  it("finds several on one line", () => {
    expect(findTodos("// TODO: a  FIXME: b").map((t) => t.tag)).toEqual(["TODO", "FIXME"]);
  });

  it("uses the given tags instead of the defaults", () => {
    expect(findTodos("// TODO a\n// PERF b", { tags: ["PERF"] })).toMatchObject([
      { line: 1, tag: "PERF", text: "b" },
    ]);
  });
});

describe("scanTodos", () => {
  it("lists the todos of every file, sorted by path", async () => {
    const root = workspace({
      "src/b.ts": "x\n// TODO: second",
      "src/a.ts": "// FIXME: first",
      "README.md": "nothing",
    });

    expect(await scanTodos(root)).toEqual([
      { path: "src/a.ts", line: 0, column: 3, tag: "FIXME", text: "first" },
      { path: "src/b.ts", line: 1, column: 3, tag: "TODO", text: "second" },
    ]);
  });

  it("skips node_modules and .git", async () => {
    const root = workspace({
      "node_modules/x/index.js": "// TODO: not mine",
      ".git/hooks/pre-commit": "# TODO: not mine",
      "a.ts": "// TODO: mine",
    });

    expect((await scanTodos(root)).map((t) => t.path)).toEqual(["a.ts"]);
  });

  it("skips what .gitignore ignores", async () => {
    const root = workspace({
      ".gitignore": "dist/\n*.log\n",
      "dist/out.js": "// TODO: built",
      "debug.log": "TODO: logged",
      "a.ts": "// TODO: mine",
    });

    expect((await scanTodos(root)).map((t) => t.path)).toEqual(["a.ts"]);
  });

  it("skips the exclude globs", async () => {
    const root = workspace({ "gen/a.ts": "// TODO x", "a.ts": "// TODO y" });

    const todos = await scanTodos(root, { exclude: ["gen/**"] });

    expect(todos.map((t) => t.path)).toEqual(["a.ts"]);
  });

  it("skips binary files", async () => {
    const root = workspace({ "img.bin": "\0\0TODO: binary\0", "a.ts": "// TODO y" });

    expect((await scanTodos(root)).map((t) => t.path)).toEqual(["a.ts"]);
  });
});

describe("moving between todos", () => {
  const text = ["a", "// TODO: one", "b", "// FIXME: two", "c"].join("\n");

  it("todos.next goes to the next todo's tag", () => {
    const ide = code(`|${text}`).executeCommand("todos.next");

    expect(ide.cursor()).toMatchObject({ line: 1, column: 3 });
  });

  it("todos.next twice goes to the second one", () => {
    const ide = code(`|${text}`).executeCommand("todos.next").executeCommand("todos.next");

    expect(ide.cursor().line).eq(3);
  });

  it("todos.next wraps to the first after the last", () => {
    const ide = code(`${text.replace("c", "|c")}`).executeCommand("todos.next");

    expect(ide.cursor().line).eq(1);
  });

  it("todos.previous goes back", () => {
    const ide = code(`${text.replace("c", "|c")}`).executeCommand("todos.previous");

    expect(ide.cursor().line).eq(3);
  });

  it("does nothing in a file without todos", () => {
    const ide = code("a\n|b").executeCommand("todos.next");

    expect(ide.cursor().line).eq(1);
  });

  it("works on a file opened from the workspace", () => {
    const root = workspace({ "a.ts": "x\ny\n// HACK: here" });
    const ide = code("|");
    ide.setWorkspace(root);
    ide.openAndFocus(join(root, "a.ts"));

    ide.executeCommand("todos.next");

    expect(ide.cursor().line).eq(2);
  });
});
