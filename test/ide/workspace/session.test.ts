import { rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { restoreSession, saveSession } from "../../../src/Workspace/session.js";
import { vim, workspace } from "../harness.js";

// Proposed module src/Workspace/session.ts: reopen what was open last time.
//
//   saveSession(ctx) -> plain data (JSON-safe):
//     { files: [{ path, line, column }], active: path }
//   restoreSession(ctx, data) opens the files in order with their cursors
//     and focuses the active one; files that are gone are skipped
//
// Also the recent files list: ctx.recentFiles() -> paths, most recent
// first, no repeats.

function withFiles() {
  const root = workspace({ "a.txt": "aaa\nbbb", "b.txt": "ccc" });
  const ide = vim("|", { width: 60, height: 16 });
  ide.openAndFocus(join(root, "a.txt"));
  ide.keys("jl");
  ide.openAndFocus(join(root, "b.txt"));
  return { root, ide };
}

describe("sessions", () => {
  it("saves the open files and which one is active", () => {
    const { root, ide } = withFiles();

    const session = saveSession(ide);

    expect(session.files.map((f: { path: string }) => f.path)).toEqual(
      expect.arrayContaining([join(root, "a.txt"), join(root, "b.txt")]),
    );
    expect(session.active).eq(join(root, "b.txt"));
  });

  it("saves each file's cursor", () => {
    const { root, ide } = withFiles();

    const session = saveSession(ide);
    const a = session.files.find((f: { path: string }) => f.path === join(root, "a.txt"));

    expect(a).toMatchObject({ line: 1, column: 1 });
  });

  it("is plain data that survives JSON", () => {
    const { ide } = withFiles();
    const session = saveSession(ide);

    expect(JSON.parse(JSON.stringify(session))).toEqual(session);
  });

  it("restoring opens the files with their cursors", () => {
    const { root, ide } = withFiles();
    const session = JSON.parse(JSON.stringify(saveSession(ide)));

    const fresh = vim("|", { width: 60, height: 16 });
    restoreSession(fresh, session);

    expect(fresh.window().document.file.path()).eq(join(root, "b.txt"));
    fresh.openAndFocus(join(root, "a.txt"));
    expect(fresh.cursor()).toEqual({ line: 1, column: 1 });
  });

  it("skips files that no longer exist", () => {
    const { root, ide } = withFiles();
    const session = saveSession(ide);
    rmSync(join(root, "a.txt"));

    const fresh = vim("|", { width: 60, height: 16 });

    expect(() => restoreSession(fresh, session)).not.toThrow();
    expect(fresh.window().document.file.path()).eq(join(root, "b.txt"));
  });
});

describe("recent files", () => {
  it("lists opened files, most recent first, without repeats", () => {
    const root = workspace({ "a.txt": "", "b.txt": "" });
    const ide = vim("|");

    ide.openAndFocus(join(root, "a.txt"));
    ide.openAndFocus(join(root, "b.txt"));
    ide.openAndFocus(join(root, "a.txt"));

    expect(ide.recentFiles().slice(0, 2)).toEqual([
      join(root, "a.txt"),
      join(root, "b.txt"),
    ]);
  });
});
