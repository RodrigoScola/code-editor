import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FileOperations,
  incrementFileName,
  validateFileName,
} from "../../../src/Explorer/fileOperations.js";
import { workspace } from "../../ide/harness.js";

// Proposed module src/Explorer/fileOperations.ts: what the Explorer does to
// files, kept apart from the tree UI.
//   new FileOperations({ trash? })      trash(path) is called instead of a
//                                       permanent delete when given
//   ops.createFile(folder, name)        "a/b/c.ts" creates the folders too
//   ops.createFolder(folder, name)
//   ops.rename(path, newName)
//   ops.delete(path)
//   ops.copy(paths) / ops.cut(paths) / ops.paste(targetFolder)
//     pasting next to the original picks a new name (explorer.incrementalNaming)
//   ops.duplicate(path)
//   ops.undo() / ops.redo()             undo the last create, rename, move, copy
//
//   validateFileName(name, { folderEntries, platform })
//     -> null, or { severity: "error" | "warning", message }
//   incrementFileName(name, isFolder, "simple" | "smart")

describe("validateFileName", () => {
  const check = (name: string, platform = "linux", folderEntries: string[] = []) =>
    validateFileName(name, { folderEntries, platform });

  it("accepts a normal name", () => {
    expect(check("main.ts")).toBeNull();
  });

  it("needs a name", () => {
    expect(check("")).toMatchObject({ severity: "error" });
  });

  it("refuses a name that already exists", () => {
    expect(check("a.ts", "linux", ["a.ts"])?.message).toContain("already exists");
  });

  it("refuses characters Windows doesn't allow", () => {
    for (const bad of ["a<b", "a>b", 'a"b', "a|b", "a?b", "a*b", "a:b"]) {
      expect(check(bad, "win32"), bad).toMatchObject({ severity: "error" });
    }
  });

  it("allows those characters elsewhere, except /", () => {
    expect(check("a:b", "linux")).toBeNull();
  });

  it("refuses a trailing dot or space on Windows", () => {
    expect(check("name.", "win32")).toMatchObject({ severity: "error" });
    expect(check("name ", "win32")).toMatchObject({ severity: "error" });
  });

  it("warns about leading or trailing white space", () => {
    expect(check(" name", "linux")).toMatchObject({ severity: "warning" });
  });

  it("refuses reserved Windows names", () => {
    expect(check("CON", "win32")).toMatchObject({ severity: "error" });
    expect(check("nul.txt", "win32")).toMatchObject({ severity: "error" });
  });
});

describe("incrementFileName", () => {
  it("simple adds copy, then copy 2, copy 3", () => {
    expect(incrementFileName("file.txt", false, "simple")).eq("file copy.txt");
    expect(incrementFileName("file copy.txt", false, "simple")).eq("file copy 2.txt");
    expect(incrementFileName("file copy 2.txt", false, "simple")).eq("file copy 3.txt");
  });

  it("simple works for folders", () => {
    expect(incrementFileName("src", true, "simple")).eq("src copy");
  });

  it("smart increases a number at the end", () => {
    expect(incrementFileName("file1.txt", false, "smart")).eq("file2.txt");
  });

  it("smart adds .1 when there is no number", () => {
    expect(incrementFileName("file.txt", false, "smart")).eq("file.1.txt");
  });
});

describe("FileOperations", () => {
  it("creates a file with its folders", () => {
    const root = workspace({});
    new FileOperations().createFile(root, "a/b/c.ts");

    expect(existsSync(join(root, "a", "b", "c.ts"))).eq(true);
  });

  it("creates a folder", () => {
    const root = workspace({});
    new FileOperations().createFolder(root, "lib");

    expect(existsSync(join(root, "lib"))).eq(true);
  });

  it("renames", () => {
    const root = workspace({ "a.ts": "x" });
    new FileOperations().rename(join(root, "a.ts"), "b.ts");

    expect(readFileSync(join(root, "b.ts"), "utf8")).eq("x");
    expect(existsSync(join(root, "a.ts"))).eq(false);
  });

  it("delete uses the trash when there is one", () => {
    const root = workspace({ "a.ts": "x" });
    const trashed: string[] = [];

    new FileOperations({ trash: (p: string) => trashed.push(p) }).delete(join(root, "a.ts"));

    expect(trashed).toEqual([join(root, "a.ts")]);
  });

  it("delete removes the file when there is no trash", () => {
    const root = workspace({ "a.ts": "x" });
    new FileOperations().delete(join(root, "a.ts"));

    expect(existsSync(join(root, "a.ts"))).eq(false);
  });

  it("copy and paste into another folder keeps the name", () => {
    const root = workspace({ "a.ts": "x", "lib/.keep": "" });
    const ops = new FileOperations();

    ops.copy([join(root, "a.ts")]);
    ops.paste(join(root, "lib"));

    expect(readFileSync(join(root, "lib", "a.ts"), "utf8")).eq("x");
    expect(existsSync(join(root, "a.ts"))).eq(true);
  });

  it("copy and paste next to the original picks a new name", () => {
    const root = workspace({ "a.ts": "x" });
    const ops = new FileOperations();

    ops.copy([join(root, "a.ts")]);
    ops.paste(root);

    expect(existsSync(join(root, "a copy.ts"))).eq(true);
  });

  it("cut and paste moves", () => {
    const root = workspace({ "a.ts": "x", "lib/.keep": "" });
    const ops = new FileOperations();

    ops.cut([join(root, "a.ts")]);
    ops.paste(join(root, "lib"));

    expect(existsSync(join(root, "a.ts"))).eq(false);
    expect(existsSync(join(root, "lib", "a.ts"))).eq(true);
  });

  it("refuses to paste a folder into itself", () => {
    const root = workspace({ "lib/a.ts": "x" });
    const ops = new FileOperations();

    ops.copy([join(root, "lib")]);

    expect(() => ops.paste(join(root, "lib"))).toThrow();
  });

  it("duplicate makes a copy next to it", () => {
    const root = workspace({ "a.ts": "x" });
    new FileOperations().duplicate(join(root, "a.ts"));

    expect(readFileSync(join(root, "a copy.ts"), "utf8")).eq("x");
  });

  it("undo reverses a rename and redo does it again", () => {
    const root = workspace({ "a.ts": "x" });
    const ops = new FileOperations();
    ops.rename(join(root, "a.ts"), "b.ts");

    ops.undo();
    expect(existsSync(join(root, "a.ts"))).eq(true);
    expect(existsSync(join(root, "b.ts"))).eq(false);

    ops.redo();
    expect(existsSync(join(root, "b.ts"))).eq(true);
  });

  it("undo removes a created file", () => {
    const root = workspace({});
    const ops = new FileOperations();
    ops.createFile(root, "new.ts");

    ops.undo();

    expect(existsSync(join(root, "new.ts"))).eq(false);
  });
});
