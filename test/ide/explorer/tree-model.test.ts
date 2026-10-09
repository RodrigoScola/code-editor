import { describe, expect, it } from "vitest";
import { buildTree, filterTree } from "../../../src/Explorer/treeModel.js";

// Proposed module src/Explorer/treeModel.ts: the Explorer tree computed
// from a flat list of entries, with no file system access, so every rule
// can be tested exactly.
//
//   buildTree(entries, options) -> nodes [{ name, path, type, children,
//     nested?: nodes, decoration? }]
//   entries: [{ path, type: "file" | "folder", mtime? }] (paths relative,
//     "/" separated)
//   options:
//     sortOrder: "default" (folders first) | "mixed" | "filesFirst" |
//                "type" (by extension) | "modified" (newest first)
//     lexicographic: "default" | "upper" | "lower" | "unicode"
//     compactFolders: single-child folder chains shown as one "a/b/c" node
//     fileNesting: { enabled, patterns: { "package.json": "package-lock.json, yarn.lock",
//                    "*.ts": "${capture}.js" } }
//     exclude: files.exclude, { glob: true | { when: "$(basename).ts" } }
//     gitStatus: { [path]: "M" | "A" | "D" | "U" | "!" }
//     problems: { [path]: { errors, warnings } }
//   Names compare numerically: a2 before a10.
//
//   filterTree(nodes, text, mode: "filter" | "highlight") -> nodes matching
//     the text fuzzily, plus their ancestors

const file = (path: string, mtime = 0) => ({ path, type: "file" as const, mtime });
const folder = (path: string) => ({ path, type: "folder" as const });
const names = (nodes: { name: string }[]) => nodes.map((n) => n.name);

describe("sorting", () => {
  // modified times differ from name order, so each sort is distinguishable
  const entries = [file("b.ts", 3), folder("lib"), file("a.css", 1), folder("src"), file("a.ts", 2)];

  it("default puts folders first, then files, by name", () => {
    expect(names(buildTree(entries, { sortOrder: "default", compactFolders: false }))).toEqual([
      "lib",
      "src",
      "a.css",
      "a.ts",
      "b.ts",
    ]);
  });

  it("mixed sorts folders and files together", () => {
    expect(names(buildTree(entries, { sortOrder: "mixed", compactFolders: false }))).toEqual([
      "a.css",
      "a.ts",
      "b.ts",
      "lib",
      "src",
    ]);
  });

  it("filesFirst puts files before folders", () => {
    expect(names(buildTree(entries, { sortOrder: "filesFirst", compactFolders: false }))).toEqual([
      "a.css",
      "a.ts",
      "b.ts",
      "lib",
      "src",
    ]);
  });

  it("type sorts files by extension, then name", () => {
    expect(names(buildTree(entries, { sortOrder: "type", compactFolders: false }))).toEqual([
      "lib",
      "src",
      "a.css",
      "a.ts",
      "b.ts",
    ]);
  });

  it("modified puts the newest files first, folders still first", () => {
    expect(names(buildTree(entries, { sortOrder: "modified", compactFolders: false }))).toEqual([
      "lib",
      "src",
      "b.ts",
      "a.ts",
      "a.css",
    ]);
  });

  it("compares numbers in names by value", () => {
    expect(names(buildTree([file("a10.ts"), file("a2.ts"), file("a1.ts")], {}))).toEqual([
      "a1.ts",
      "a2.ts",
      "a10.ts",
    ]);
  });

  it("lexicographic upper puts upper case first", () => {
    const tree = buildTree([file("a.ts"), file("B.ts"), file("c.ts")], { lexicographic: "upper" });

    expect(names(tree)).toEqual(["B.ts", "a.ts", "c.ts"]);
  });

  it("lexicographic default ignores case", () => {
    const tree = buildTree([file("c.ts"), file("B.ts"), file("a.ts")], { lexicographic: "default" });

    expect(names(tree)).toEqual(["a.ts", "B.ts", "c.ts"]);
  });
});

describe("compact folders", () => {
  it("joins a chain of single-folder folders", () => {
    const tree = buildTree([folder("src"), folder("src/main"), folder("src/main/java"), file("src/main/java/A.java")], {
      compactFolders: true,
    });

    expect(names(tree)).toEqual(["src/main/java"]);
    expect(names(tree[0].children)).toEqual(["A.java"]);
  });

  it("stops where a folder has more than one child", () => {
    const tree = buildTree(
      [folder("src"), file("src/index.ts"), folder("src/main"), folder("src/main/java"), file("src/main/java/A.java")],
      { compactFolders: true },
    );

    expect(names(tree)).toEqual(["src"]);
    expect(names(tree[0].children)).toEqual(["main/java", "index.ts"]);
  });

  it("can be turned off", () => {
    const tree = buildTree([folder("a"), folder("a/b"), file("a/b/c.ts")], { compactFolders: false });

    expect(names(tree)).toEqual(["a"]);
  });
});

describe("file nesting", () => {
  const nesting = {
    enabled: true,
    patterns: {
      "package.json": "package-lock.json, yarn.lock",
      "*.ts": "${capture}.js, ${capture}.d.ts",
    },
  };

  it("nests listed files under the parent file", () => {
    const tree = buildTree([file("package.json"), file("package-lock.json"), file("yarn.lock")], { fileNesting: nesting });

    expect(names(tree)).toEqual(["package.json"]);
    expect(names(tree[0].nested)).toEqual(["package-lock.json", "yarn.lock"]);
  });

  it("${capture} is what the * matched", () => {
    const tree = buildTree([file("a.ts"), file("a.js"), file("a.d.ts"), file("b.js")], { fileNesting: nesting });

    expect(names(tree)).toEqual(["a.ts", "b.js"]);
    expect(names(tree[0].nested)).toEqual(["a.d.ts", "a.js"]);
  });

  it("does nothing when disabled", () => {
    const tree = buildTree([file("package.json"), file("yarn.lock")], { fileNesting: { ...nesting, enabled: false } });

    expect(names(tree)).toEqual(["package.json", "yarn.lock"]);
  });
});

describe("files.exclude", () => {
  it("hides matching files", () => {
    const tree = buildTree([file("a.ts"), file("a.log"), folder(".git"), file(".git/HEAD")], {
      exclude: { "**/*.log": true, "**/.git": true },
    });

    expect(names(tree)).toEqual(["a.ts"]);
  });

  it("when hides a file only if its sibling exists", () => {
    const tree = buildTree([file("a.ts"), file("a.js"), file("b.js")], {
      exclude: { "**/*.js": { when: "$(basename).ts" } },
    });

    expect(names(tree)).toEqual(["a.ts", "b.js"]);
  });

  it("false turns a pattern off", () => {
    const tree = buildTree([file("a.log")], { exclude: { "**/*.log": false } });

    expect(names(tree)).toEqual(["a.log"]);
  });
});

describe("decorations", () => {
  it("shows the git status letter on a file", () => {
    const tree = buildTree([file("a.ts")], { gitStatus: { "a.ts": "M" } });

    expect(tree[0].decoration).toMatchObject({ letter: "M" });
  });

  it("marks the folders above a changed file, without a letter", () => {
    const tree = buildTree([folder("src"), file("src/a.ts")], { compactFolders: false, gitStatus: { "src/a.ts": "U" } });

    expect(tree[0].decoration).toMatchObject({ containsChanges: true });
    expect(tree[0].decoration.letter).toBeUndefined();
  });

  it("shows problem counts and marks folders that contain errors", () => {
    const tree = buildTree([folder("src"), file("src/a.ts")], {
      compactFolders: false,
      problems: { "src/a.ts": { errors: 2, warnings: 0 } },
    });

    expect(tree[0].children[0].decoration).toMatchObject({ errors: 2 });
    expect(tree[0].decoration).toMatchObject({ containsErrors: true });
  });
});

describe("filterTree (type to find)", () => {
  const tree = buildTree([folder("src"), file("src/main.ts"), file("src/util.ts"), file("readme.md")], {
    compactFolders: false,
  });

  it("filter mode keeps matches and their ancestors", () => {
    const filtered = filterTree(tree, "mai", "filter");

    expect(names(filtered)).toEqual(["src"]);
    expect(names(filtered[0].children)).toEqual(["main.ts"]);
  });

  it("highlight mode keeps everything and marks the matches", () => {
    const highlighted = filterTree(tree, "mai", "highlight");

    expect(names(highlighted)).toEqual(["src", "readme.md"]);
    expect(highlighted[0].children[0].match).toBeTruthy();
    expect(highlighted[1].match).toBeFalsy();
  });
});
