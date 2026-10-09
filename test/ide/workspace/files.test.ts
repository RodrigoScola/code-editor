import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { vim, workspace } from "../harness.js";

// Opening, saving and closing files.
//   :w              write          :w {path}   write a copy
//   :e {path}       open           :e!         reload from disk, drop changes
//   :q              close          :q!         close, drop changes
//   :wq             write and close
// The document knows when it is modified (document.dirty), and undoing back
// to the saved text makes it clean again.
// Closing the last window doesn't exit the process itself: it calls the
// listeners registered with ctx.onQuit(listener) and index.ts exits.
// Line endings and the final newline are written back the way they were
// read.

describe(":w", () => {
  it("writes the buffer to its file", () => {
    const ide = vim("|hello", { path: "a.txt" }).keys("iX<Esc>:w<CR>");

    expect(ide.document().read()).eq("Xhello");
  });

  it(":w {path} writes a copy", () => {
    const root = workspace({});
    const copy = join(root, "copy.txt");

    vim("|hello").keys(`:w ${copy}<CR>`);

    expect(readFileSync(copy, "utf8")).eq("hello");
  });
});

describe("modified state", () => {
  it("a fresh document is not modified", () => {
    expect(vim("|abc").document().dirty).eq(false);
  });

  it("editing makes it modified", () => {
    expect(vim("|abc").keys("iX<Esc>").document().dirty).eq(true);
  });

  it(":w makes it clean", () => {
    expect(vim("|abc").keys("iX<Esc>:w<CR>").document().dirty).eq(false);
  });

  it("undoing back to the saved text makes it clean", () => {
    const ide = vim("|abc").keys("iX<Esc>");
    expect(ide.document().dirty).eq(true);

    expect(ide.keys("u").document().dirty).eq(false);
  });
});

describe(":e", () => {
  it("opens a file from disk", () => {
    const root = workspace({ "b.txt": "bee" });
    const path = join(root, "b.txt");

    const ide = vim("|a").keys(`:e ${path}<CR>`);

    expect(ide.document().file.path()).eq(path);
    expect(ide.lines()).toEqual(["bee"]);
  });

  it("switches to a file that is already open instead of opening it twice", () => {
    const root = workspace({ "b.txt": "bee" });
    const path = join(root, "b.txt");
    const ide = vim("|a");

    ide.keys(`:e ${path}<CR>`);
    expect(ide.document().file.path()).eq(path);
    expect(ide.editorGroup().management.all()).length(2);

    ide.keys(`:e ${path}<CR>`);

    expect(ide.editorGroup().management.all()).length(2);
  });

  it("opens a file that doesn't exist yet as an empty buffer, and :w creates it", () => {
    const root = workspace({});
    const path = join(root, "new.txt");
    const ide = vim("|a").keys(`:e ${path}<CR>`);

    expect(ide.lines()).toEqual([""]);

    ide.keys("iX<Esc>:w<CR>");
    expect(readFileSync(path, "utf8")).eq("X");
  });

  it(":e! reloads from disk and drops the changes", () => {
    const root = workspace({ "b.txt": "old" });
    const path = join(root, "b.txt");
    const ide = vim("|a");
    ide.openAndFocus(path);
    ide.keys("iX<Esc>");

    writeFileSync(path, "new");
    ide.keys(":e!<CR>");

    expect(ide.lines()).toEqual(["new"]);
    expect(ide.document().dirty).eq(false);
  });
});

describe("closing", () => {
  it(":q with unsaved changes refuses and says why", () => {
    const ide = vim("|abc", { width: 80 }).keys("iX<Esc>:q<CR>");

    expect(ide.statusLine()).toContain("No write since last change");
    expect(ide.visibleCodeWindows()).length(1);
  });

  it(":q on the last window asks the app to quit instead of exiting", () => {
    const ide = vim("|abc");
    const quit = vi.fn();
    ide.onQuit(quit);

    ide.keys(":q<CR>");

    expect(quit).toHaveBeenCalledOnce();
  });

  it(":q! quits even with unsaved changes", () => {
    const ide = vim("|abc");
    const quit = vi.fn();
    ide.onQuit(quit);

    ide.keys("iX<Esc>:q!<CR>");

    expect(quit).toHaveBeenCalledOnce();
  });

  it(":wq writes and quits", () => {
    const ide = vim("|abc");
    const quit = vi.fn();
    ide.onQuit(quit);

    ide.keys("iX<Esc>:wq<CR>");

    expect(ide.document().read()).eq("Xabc");
    expect(quit).toHaveBeenCalledOnce();
  });
});

describe("line endings", () => {
  it("an empty file has one empty line", () => {
    expect(vim("").lines()).toEqual([""]);
  });

  it("a final newline is not shown as an extra empty line", () => {
    const root = workspace({ "a.txt": "a\nb\n" });
    const ide = vim("|x");
    ide.openAndFocus(join(root, "a.txt"));

    expect(ide.lines()).toEqual(["a", "b"]);
  });

  it("a final newline is written back", () => {
    const root = workspace({ "a.txt": "a\nb\n" });
    const path = join(root, "a.txt");
    const ide = vim("|x");
    ide.openAndFocus(path);

    ide.keys("A!<Esc>:w<CR>");

    expect(readFileSync(path, "utf8")).eq("a!\nb\n");
  });

  it("a file without a final newline stays without one", () => {
    const root = workspace({ "a.txt": "a\nb" });
    const path = join(root, "a.txt");
    const ide = vim("|x");
    ide.openAndFocus(path);

    ide.keys("A!<Esc>:w<CR>");

    expect(readFileSync(path, "utf8")).eq("a!\nb");
  });

  it("Windows line endings are kept", () => {
    const root = workspace({ "a.txt": "a\r\nb\r\n" });
    const path = join(root, "a.txt");
    const ide = vim("|x");
    ide.openAndFocus(path);

    ide.keys("A!<Esc>:w<CR>");

    expect(readFileSync(path, "utf8")).eq("a!\r\nb\r\n");
    expect(existsSync(path)).eq(true);
  });
});
