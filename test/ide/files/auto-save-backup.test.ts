import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackupStore } from "../../../src/Files/backup.js";
import { workspace } from "../harness.js";
import { code } from "../harness.js";

// Auto save (files.autoSave, files.autoSaveDelay):
//   "off"            never
//   "afterDelay"     files.autoSaveDelay ms (default 1000) after the last
//                    edit; every edit restarts the wait
//   "onFocusChange"  when the editor loses focus
//   "onWindowChange" when the app window loses focus
//                    (ctx.windowFocusChanged(false))
//
// Hot exit (files.hotExit): unsaved changes are written to backups so
// they come back after a restart. Proposed module src/Files/backup.ts:
//   new BackupStore(folder)
//   store.backup(path, text) / store.discard(path) / store.list() / store.read(path)
//   ctx.backups is one; saving a file discards its backup.
//
// Saving over a newer file: if the file changed on disk since it was read,
// a save doesn't overwrite it; it reports the conflict instead
// (VS Code's "The content of the file is newer").

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("auto save afterDelay", () => {
  function editing() {
    const ide = code("|a", { path: "a.txt" })
      .setting("auto_save", "afterDelay")
      .setting("auto_save_delay", 1000);
    ide.type("X");
    return ide;
  }

  it("saves after the delay", () => {
    const ide = editing();

    vi.advanceTimersByTime(1000);

    expect(ide.window().document.read()).eq("Xa");
  });

  it("does not save before the delay", () => {
    const ide = editing();

    vi.advanceTimersByTime(999);

    expect(ide.window().document.read()).eq("a");
  });

  it("each edit restarts the wait", () => {
    const ide = editing();
    vi.advanceTimersByTime(800);
    ide.type("Y");
    vi.advanceTimersByTime(800);

    expect(ide.window().document.read()).eq("a");

    vi.advanceTimersByTime(200);
    expect(ide.window().document.read()).eq("XYa");
  });

  it("does nothing when off", () => {
    const ide = code("|a", { path: "a.txt" }).setting("auto_save", "off").type("X");

    vi.advanceTimersByTime(60_000);

    expect(ide.window().document.read()).eq("a");
  });
});

describe("auto save on focus change", () => {
  it("onFocusChange saves when another editor gets focus", () => {
    const ide = code("|a", { path: "a.txt" }).setting("auto_save", "onFocusChange").type("X");
    const first = ide.window();

    ide.openMemoryFile("b.txt", "b");

    expect(first.document.read()).eq("Xa");
  });

  it("onWindowChange saves when the app window loses focus", () => {
    const ide = code("|a", { path: "a.txt" }).setting("auto_save", "onWindowChange").type("X");

    ide.windowFocusChanged(false);

    expect(ide.window().document.read()).eq("Xa");
  });

  it("onWindowChange does not save on a switch between editors", () => {
    const ide = code("|a", { path: "a.txt" }).setting("auto_save", "onWindowChange").type("X");
    const first = ide.window();

    ide.openMemoryFile("b.txt", "b");

    expect(first.document.read()).eq("a");
  });
});

describe("backups", () => {
  it("keeps and reads back unsaved text", () => {
    const store = new BackupStore(workspace({}));

    store.backup("/p/a.ts", "draft");

    expect(store.read("/p/a.ts")).eq("draft");
    expect(store.list()).toEqual(["/p/a.ts"]);
  });

  it("survives a new store on the same folder (a restart)", () => {
    const folder = workspace({});
    new BackupStore(folder).backup("/p/a.ts", "draft");

    expect(new BackupStore(folder).read("/p/a.ts")).eq("draft");
  });

  it("discard removes a backup", () => {
    const store = new BackupStore(workspace({}));
    store.backup("/p/a.ts", "draft");

    store.discard("/p/a.ts");

    expect(store.list()).toEqual([]);
  });

  it("the editor backs up modified documents and saving discards the backup", () => {
    const ide = code("|a", { path: "a.txt" }).type("X");
    ide.backups.backupAll();
    expect(ide.backups.read("a.txt")).eq("Xa");

    ide.executeCommand("textEditor.saveFile");

    expect(ide.backups.list()).toEqual([]);
  });
});

describe("saving over a newer file", () => {
  it("does not overwrite a file that changed on disk and reports it", () => {
    vi.useRealTimers();
    const root = workspace({ "a.txt": "old" });
    const path = join(root, "a.txt");
    const ide = code("|", { width: 100 });
    ide.openAndFocus(path);
    ide.type("mine ");

    writeFileSync(path, "theirs");
    ide.executeCommand("textEditor.saveFile");

    expect(readFileSync(path, "utf8")).eq("theirs");
    expect(ide.messages().at(-1)?.text).toContain("newer");
  });
});
