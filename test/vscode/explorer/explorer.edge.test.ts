import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileOperations, incrementFileName, validateFileName } from "../../../src/Explorer/fileOperations.js";
import { buildTree } from "../../../src/Explorer/treeModel.js";
import { LocalHistory } from "../../../src/Workspace/localHistory.js";
import { workspace } from "../../ide/harness.js";

// Edge cases for the Explorer (base specs: file-operations, tree-model,
// outline, local-history).

describe("file names", () => {
  it("a nested name is checked part by part", () => {
    expect(validateFileName("ok/bad|name", { folderEntries: [], platform: "win32" })).toMatchObject({
      severity: "error",
    });
  });

  it("an existing name with different case clashes on Windows", () => {
    expect(validateFileName("README.md", { folderEntries: ["readme.md"], platform: "win32" })).toMatchObject({
      severity: "error",
    });
  });

  it("different case is a different file on Linux", () => {
    expect(validateFileName("README.md", { folderEntries: ["readme.md"], platform: "linux" })).toBeNull();
  });

  it("names of only dots are refused", () => {
    expect(validateFileName("..", { folderEntries: [], platform: "linux" })).toMatchObject({ severity: "error" });
  });

  it("simple naming of a file with several dots puts copy before the last extension", () => {
    expect(incrementFileName("a.test.ts", false, "simple")).eq("a.test copy.ts");
  });

  it("simple naming of a dot file keeps the dot", () => {
    expect(incrementFileName(".env", false, "simple")).eq(".env copy");
  });
});

describe("file operations", () => {
  it("pasting the same copy twice keeps making new names", () => {
    const root = workspace({ "a.ts": "x" });
    const ops = new FileOperations();
    ops.copy([join(root, "a.ts")]);

    ops.paste(root);
    ops.paste(root);

    expect(existsSync(join(root, "a copy.ts"))).eq(true);
    expect(existsSync(join(root, "a copy 2.ts"))).eq(true);
  });

  it("cut and paste into the same folder does nothing", () => {
    const root = workspace({ "a.ts": "x" });
    const ops = new FileOperations();
    ops.cut([join(root, "a.ts")]);

    ops.paste(root);

    expect(existsSync(join(root, "a.ts"))).eq(true);
    expect(existsSync(join(root, "a copy.ts"))).eq(false);
  });

  it("a cut can only be pasted once", () => {
    const root = workspace({ "a.ts": "x", "one/.keep": "", "two/.keep": "" });
    const ops = new FileOperations();
    ops.cut([join(root, "a.ts")]);
    ops.paste(join(root, "one"));

    ops.paste(join(root, "two"));

    expect(existsSync(join(root, "two", "a.ts"))).eq(false);
  });

  it("undo of a move puts it back", () => {
    const root = workspace({ "a.ts": "x", "lib/.keep": "" });
    const ops = new FileOperations();
    ops.cut([join(root, "a.ts")]);
    ops.paste(join(root, "lib"));

    ops.undo();

    expect(existsSync(join(root, "a.ts"))).eq(true);
  });

  it("creating a file that exists fails without touching it", () => {
    const root = workspace({ "a.ts": "keep" });

    expect(() => new FileOperations().createFile(root, "a.ts")).toThrow();
  });
});

describe("tree", () => {
  const file = (path: string) => ({ path, type: "file" as const });
  const folder = (path: string) => ({ path, type: "folder" as const });

  it("a chain that ends in an empty folder is still compacted", () => {
    const tree = buildTree([folder("a"), folder("a/b")], { compactFolders: true });

    expect(tree.map((n: { name: string }) => n.name)).toEqual(["a/b"]);
  });

  it("nesting doesn't nest a file under itself", () => {
    const tree = buildTree([file("a.ts")], { fileNesting: { enabled: true, patterns: { "*.ts": "${capture}.ts" } } });

    expect(tree[0].nested ?? []).toEqual([]);
  });

  it("an excluded folder hides everything inside it", () => {
    const tree = buildTree([folder("dist"), file("dist/a.js"), file("src.ts")], { exclude: { dist: true } });

    expect(tree.map((n: { name: string }) => n.name)).toEqual(["src.ts"]);
  });

  it("git decorations on a deleted file still show on its folder", () => {
    const tree = buildTree([folder("src"), file("src/a.ts")], {
      compactFolders: false,
      gitStatus: { "src/gone.ts": "D" },
    });

    expect(tree[0].decoration).toMatchObject({ containsChanges: true });
  });
});

describe("local history", () => {
  it("a save from a different source is not merged", () => {
    let now = 0;
    const history = new LocalHistory({ clock: () => now, mergeWindow: 10 });
    history.add("/p/a.ts", "v1", "File Saved");
    now += 1000;
    history.add("/p/a.ts", "v2", "Undo / Redo");

    expect(history.entries("/p/a.ts")).toHaveLength(2);
  });

  it("an entry identical to the last one is not added", () => {
    let now = 0;
    const history = new LocalHistory({ clock: () => now });
    history.add("/p/a.ts", "same");
    now += 60_000;
    history.add("/p/a.ts", "same");

    expect(history.entries("/p/a.ts")).toHaveLength(1);
  });
});
