import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  previewReplace,
  replaceInFiles,
  searchFiles,
  serializeSearchEditor,
} from "../../../src/Search/projectSearch.js";
import { workspace } from "../../ide/harness.js";

// The Search view (Ctrl+Shift+F) beyond the basics in test/ide:
// more searchFiles options (src/Search/projectSearch.ts):
//   include / exclude: comma-separated globs; a pattern with no glob
//     characters or slash is a folder or file name at any depth (the Search
//     view assumes a leading **/)
//   useExcludeSettingsAndIgnoreFiles (default true): applies
//     filesExclude, searchExclude, .gitignore (with ! negation, nested
//     .gitignore files) and .ignore files
//   smartCase: a query with no upper case letters ignores case
//   maxResults: stops early and reports { limitHit: true }
//   multiline regex with \n
// replaceInFiles(root, results, replacement, { preserveCase })
// previewReplace(result, replacement) -> { before, after } for the diff view
// serializeSearchEditor(query, results, { contextLines, flags }) -> the text
//   of a .code-search Search Editor file

const where = (results: { path: string; line: number }[]) => results.map((r) => `${r.path}:${r.line}`);

function project() {
  return workspace({
    "src/a.ts": "todo one\nTODO two",
    "src/b.js": "todo three",
    "docs/guide.md": "todo four",
    "example/x.txt": "todo five",
    "logs/app.log": "todo six",
    "logs/keep.log": "todo seven",
    "lib/vendor/v.js": "todo eight",
    "lib/.gitignore": "vendor/\n",
    ".gitignore": "*.log\n!keep.log\n",
    ".ignore": "docs/\n",
  });
}

const all = { useExcludeSettingsAndIgnoreFiles: false };

describe("include and exclude", () => {
  it("include takes comma-separated globs", () => {
    expect(where(searchFiles(project(), "todo", { ...all, include: "src/**/*.ts, docs/**" }))).toEqual([
      "docs/guide.md:0",
      "src/a.ts:0",
      "src/a.ts:1",
    ]);
  });

  it("a bare name means that folder anywhere", () => {
    expect(where(searchFiles(project(), "todo", { ...all, include: "example" }))).toEqual(["example/x.txt:0"]);
  });

  it("exclude removes matches", () => {
    const paths = searchFiles(project(), "todo", { ...all, exclude: "**/*.js, logs" }).map((r: { path: string }) => r.path);

    expect(paths).not.toContain("src/b.js");
    expect(paths).not.toContain("logs/app.log");
  });
});

describe("exclude settings and ignore files", () => {
  it("applies .gitignore, including ! to keep a file", () => {
    const paths = searchFiles(project(), "todo").map((r: { path: string }) => r.path);

    expect(paths).not.toContain("logs/app.log");
    expect(paths).toContain("logs/keep.log");
  });

  it("applies a .gitignore inside a folder to that folder", () => {
    expect(searchFiles(project(), "todo").map((r: { path: string }) => r.path)).not.toContain("lib/vendor/v.js");
  });

  it("applies .ignore files", () => {
    expect(searchFiles(project(), "todo").map((r: { path: string }) => r.path)).not.toContain("docs/guide.md");
  });

  it("applies files.exclude and search.exclude", () => {
    const paths = searchFiles(project(), "todo", {
      filesExclude: { "**/*.md": true },
      searchExclude: { "example/**": true },
    }).map((r: { path: string }) => r.path);

    expect(paths).not.toContain("docs/guide.md");
    expect(paths).not.toContain("example/x.txt");
  });

  it("can turn all of that off", () => {
    // every "todo" in every file: 2 in a.ts and one in each of 6 others
    expect(searchFiles(project(), "todo", all)).toHaveLength(8);
  });
});

describe("matching", () => {
  it("smart case ignores case for a lower case query", () => {
    expect(where(searchFiles(project(), "todo", { ...all, include: "src/a.ts", smartCase: true }))).toEqual([
      "src/a.ts:0",
      "src/a.ts:1",
    ]);
  });

  it("smart case matches case when the query has upper case", () => {
    expect(where(searchFiles(project(), "TODO", { ...all, include: "src/a.ts", smartCase: true }))).toEqual([
      "src/a.ts:1",
    ]);
  });

  it("maxResults stops early and says so", () => {
    const results = searchFiles(project(), "todo", { ...all, maxResults: 2 });

    expect(results).toHaveLength(2);
    expect(results.limitHit).eq(true);
  });

  it("a regex with \\n matches across lines", () => {
    expect(where(searchFiles(project(), "one\\nTODO", { ...all, regex: true }))).toEqual(["src/a.ts:0"]);
  });
});

describe("replacing", () => {
  it("previewReplace shows the line before and after", () => {
    const [result] = searchFiles(project(), "three", all);

    expect(previewReplace(result, "3")).toEqual({ before: "todo three", after: "todo 3" });
  });

  it("preserveCase follows the case of each match", () => {
    const root = project();
    const results = searchFiles(root, "todo", { ...all, include: "src/a.ts" });

    replaceInFiles(root, results, "done", { preserveCase: true });

    expect(readFileSync(join(root, "src", "a.ts"), "utf8")).eq("done one\nDONE two");
  });
});

describe("search editor", () => {
  it("writes the query, flags, a summary and results with line numbers", () => {
    const root = project();
    const results = searchFiles(root, "todo", { ...all, include: "src/**" });

    const text = serializeSearchEditor("todo", results, { contextLines: 0, flags: ["CaseSensitive"] });

    expect(text).toContain("# Query: todo");
    expect(text).toContain("# Flags: CaseSensitive");
    expect(text).toContain("3 results - 2 files");
    expect(text).toContain("src/a.ts:");
    expect(text).toContain("  1: todo one");
    expect(text).toContain("  2: TODO two");
  });
});
