import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { vim, workspace } from "../harness.js";

// The project folder: ctx.setWorkspace(path) / ctx.workspace().
// The file finder, project search, quick open and git read it.

describe("setWorkspace", () => {
  it("there is no workspace until one is set", () => {
    expect(vim("|").workspace()).eq(null);
  });

  it("remembers the folder", () => {
    const root = workspace({ "a.txt": "a" });

    expect(vim("|").setWorkspace(root).workspace()).eq(root);
  });

  it("keeps it as an absolute path", () => {
    const ide = vim("|").setWorkspace(".");

    expect(ide.workspace()).eq(resolve("."));
  });

  it("a later call replaces it", () => {
    const one = workspace({});
    const two = workspace({});

    const ide = vim("|").setWorkspace(one).setWorkspace(two);

    expect(ide.workspace()).eq(two);
  });

  it("refuses a folder that doesn't exist", () => {
    const root = workspace({});

    expect(() => vim("|").setWorkspace(join(root, "nope"))).toThrow(/folder/);
  });

  it("refuses a file", () => {
    const root = workspace({ "a.txt": "a" });

    expect(() => vim("|").setWorkspace(join(root, "a.txt"))).toThrow(/folder/);
  });
});
