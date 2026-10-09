import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { replaceInFiles, searchFiles } from "../../../src/Search/projectSearch.js";
import { vim, workspace } from "../harness.js";

// Proposed module src/Search/projectSearch.ts (VS Code's search panel,
// Vim's :grep + quickfix).
//
//   searchFiles(root, query, options?) -> results, sorted by path then line
//     result: { path (relative, "/" separated), line, column (0-based),
//               text (the whole line), length (of the match) }
//     options: { regex?, caseSensitive?, wholeWord?, exclude?: globs }
//     case-insensitive by default; skips .git, node_modules, whatever
//     .gitignore lists, and binary files
//   replaceInFiles(root, results, replacement) -> how many were replaced
//
// In the editor: :grep {text} fills the quickfix list and jumps to the
// first result, :cnext / :cprev move through it.

function project() {
  return workspace({
    "a.txt": "hello\nworld hello",
    "b.txt": "nothing here",
    "src/c.ts": "const Hello = 1;",
    "node_modules/m.js": "hello",
    "dist/out.js": "hello",
    ".gitignore": "dist/\n",
    "image.bin": "hello\0\0\0",
  });
}

const where = (results: { path: string; line: number; column: number }[]) =>
  results.map((r) => `${r.path}:${r.line}:${r.column}`);

describe("searchFiles", () => {
  it("finds text across files with positions", () => {
    expect(where(searchFiles(project(), "hello"))).toEqual([
      "a.txt:0:0",
      "a.txt:1:6",
      "src/c.ts:0:6",
    ]);
  });

  it("keeps the line text and match length for showing results", () => {
    const [first] = searchFiles(project(), "world");

    expect(first.text).eq("world hello");
    expect(first.length).eq(5);
  });

  it("can match case exactly", () => {
    expect(where(searchFiles(project(), "Hello", { caseSensitive: true }))).toEqual([
      "src/c.ts:0:6",
    ]);
  });

  it("can take a regular expression", () => {
    expect(where(searchFiles(project(), "w.rld", { regex: true }))).toEqual([
      "a.txt:1:0",
    ]);
  });

  it("can match whole words only", () => {
    const root = workspace({ "a.txt": "cat concat cat" });

    expect(where(searchFiles(root, "cat", { wholeWord: true }))).toEqual([
      "a.txt:0:0",
      "a.txt:0:11",
    ]);
  });

  it("skips node_modules, ignored folders and binary files", () => {
    const paths = searchFiles(project(), "hello").map((r) => r.path);

    expect(paths).not.toContain("node_modules/m.js");
    expect(paths).not.toContain("dist/out.js");
    expect(paths).not.toContain("image.bin");
  });

  it("can exclude more with globs", () => {
    const paths = searchFiles(project(), "hello", { exclude: ["src/**"] }).map(
      (r) => r.path,
    );

    expect(paths).not.toContain("src/c.ts");
  });
});

describe("replaceInFiles", () => {
  it("replaces every result and says how many", () => {
    const root = project();
    const results = searchFiles(root, "hello", { caseSensitive: true });

    expect(replaceInFiles(root, results, "bye")).eq(2);
    expect(readFileSync(join(root, "a.txt"), "utf8")).eq("bye\nworld bye");
  });
});

describe(":grep and the quickfix list", () => {
  it(":grep jumps to the first result", () => {
    const root = project();
    const ide = vim("|", { width: 60, height: 16 });
    ide.setWorkspace(root);

    ide.keys(":grep world<CR>");

    expect(ide.window().document.file.path()).eq(join(root, "a.txt"));
    expect(ide.cursor()).toEqual({ line: 1, column: 0 });
  });

  it(":cnext goes to the next result, across files", () => {
    const root = project();
    const ide = vim("|", { width: 60, height: 16 });
    ide.setWorkspace(root);

    ide.keys(":grep hello<CR>:cnext<CR>:cnext<CR>");

    expect(ide.window().document.file.path()).eq(join(root, "src", "c.ts"));
    expect(ide.cursor()).toEqual({ line: 0, column: 6 });
  });
});
