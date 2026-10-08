import { describe, expect, it } from "vitest";
import { detectLinks } from "../../../src/Terminal/links.js";

// Clickable links in terminal output (Ctrl+click). Proposed
// src/Terminal/links.ts:
//   detectLinks(line, { cwd, home?, exists(path) -> "file" | "folder" | undefined,
//     wordSeparators? }) -> [{ text, start, end, type, path?, line?, column? }]
//   type: "url"     http(s), file and vscode URLs
//         "file"    a path that exists, with an optional line and column
//         "folder"  a path to a folder that exists
//         "word"    anything else between word separators (the fallback
//                   that searches the workspace)
//   Relative paths resolve against cwd, ~ against home.
//   line and column are 1-based as printed.
//   Trailing punctuation (. , ; :) and an unmatched closing bracket are not
//   part of a URL.

const files = ["/p/src/a.ts", "/p/README.md", "/home/me/notes.txt", "C:\\proj\\b.ts"];
const folders = ["/p/src"];
const exists = (path: string) =>
  files.includes(path) ? "file" : folders.includes(path) ? "folder" : undefined;
const options = { cwd: "/p", home: "/home/me", exists };

const links = (line: string, type?: string) =>
  detectLinks(line, options).filter((l: { type: string }) => !type || l.type === type);

describe("URLs", () => {
  it("finds a web address", () => {
    expect(links("see https://example.com/a?b=1 now", "url")).toEqual([
      expect.objectContaining({ text: "https://example.com/a?b=1", start: 4, end: 29 }),
    ]);
  });

  it("leaves out a full stop at the end", () => {
    expect(links("go to https://example.com.", "url")[0].text).eq("https://example.com");
  });

  it("leaves out a closing bracket around it", () => {
    expect(links("(https://example.com)", "url")[0].text).eq("https://example.com");
  });

  it("finds file and vscode URLs", () => {
    expect(links("file:///p/src/a.ts and vscode://settings/editor.tabSize", "url")).toHaveLength(2);
  });
});

describe("file paths with positions", () => {
  const position = (line: string) => {
    const [link] = links(line, "file");
    return link && { path: link.path, line: link.line, column: link.column };
  };

  it("path:line", () => {
    expect(position("src/a.ts:10")).toEqual({ path: "/p/src/a.ts", line: 10, column: undefined });
  });

  it("path:line:column", () => {
    expect(position("src/a.ts:10:5")).toEqual({ path: "/p/src/a.ts", line: 10, column: 5 });
  });

  it("path(line,column) like tsc and MSBuild", () => {
    expect(position("src/a.ts(10,5): error")).toEqual({ path: "/p/src/a.ts", line: 10, column: 5 });
    expect(position("src/a.ts(10, 5)")).toEqual({ path: "/p/src/a.ts", line: 10, column: 5 });
  });

  it("Python tracebacks", () => {
    expect(position('  File "src/a.ts", line 10, in main')).toEqual({ path: "/p/src/a.ts", line: 10, column: undefined });
  });

  it("an absolute path", () => {
    expect(position("/p/README.md:3")).toEqual({ path: "/p/README.md", line: 3, column: undefined });
  });

  it("a Windows path with a drive letter", () => {
    expect(position("C:\\proj\\b.ts:7:2")).toEqual({ path: "C:\\proj\\b.ts", line: 7, column: 2 });
  });

  it("~ is the home folder", () => {
    expect(position("~/notes.txt")).toEqual({ path: "/home/me/notes.txt", line: undefined, column: undefined });
  });

  it("a path to a folder is a folder link", () => {
    expect(links("cd src", "folder")[0]).toMatchObject({ text: "src", path: "/p/src" });
  });

  it("a path that doesn't exist is not a file link", () => {
    expect(links("src/missing.ts:3", "file")).toEqual([]);
  });
});

describe("word links", () => {
  it("other words become word links", () => {
    expect(links("error in widget", "word").map((l: { text: string }) => l.text)).toEqual(["error", "in", "widget"]);
  });

  it("word separators split words", () => {
    const found = detectLinks("a,b", { ...options, wordSeparators: "," }).map((l: { text: string }) => l.text);

    expect(found).toEqual(["a", "b"]);
  });

  it("file and URL links are not also word links", () => {
    expect(links("src/a.ts:3", "word")).toEqual([]);
  });
});
