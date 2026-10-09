import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { code, workspace } from "../harness.js";

// Untitled files, read-only editors and reverting, VS Code style.
//
// Untitled (VS Code: workbench.action.files.newUntitledFile, Ctrl+N):
//   textEditor.newUntitledFile -> a new tab "Untitled-1", "Untitled-2", ...
//     using the lowest number not in use. Nothing is on disk.
//   document.untitled -> true for those
//   document.label() -> the tab's text: the first non-empty line of the
//     content (trimmed, at most 40 characters) once there is content, else
//     the "Untitled-N" name (workbench.editor.untitled.labelFormat "content")
//   the language is guessed from the first line (#!/usr/bin/env node,
//     <?xml, ...) until it is set by hand (textEditor.changeLanguage)
//   textEditor.saveFile with args { path } writes it there; the tab then
//     shows that file and it is no longer untitled
//
// Read-only (VS Code: files.readonlyInclude / readonlyExclude /
// readonlyFromPermissions, workbench.action.files.toggleActiveEditorReadonlyInSession):
//   settings readonly_include / readonly_exclude: { [glob]: true }
//   setting readonly_from_permissions: a file without write permission
//   textEditor.toggleReadonly -> for this session only
//   editing a read-only document changes nothing and says "Cannot edit in
//   read-only editor" (ctx.messages()); the status line shows [RO]
//
// Revert (VS Code: workbench.action.files.revert):
//   textEditor.revertFile -> reload from disk, not modified any more

const label = (ide: ReturnType<typeof code>) => ide.document().label();

describe("new untitled file", () => {
  it("opens an empty Untitled-1 tab and focuses it", () => {
    const ide = code("|a", { path: "a.txt" });

    ide.executeCommand("textEditor.newUntitledFile");

    expect(ide.document().untitled).eq(true);
    expect(ide.lines()).toEqual([""]);
    expect(label(ide)).eq("Untitled-1");
  });

  it("numbers the next one Untitled-2", () => {
    const ide = code("|a", { path: "a.txt" });

    ide.executeCommand("textEditor.newUntitledFile");
    ide.executeCommand("textEditor.newUntitledFile");

    expect(label(ide)).eq("Untitled-2");
  });

  it("reuses the lowest free number after one is closed", () => {
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.executeCommand("textEditor.newUntitledFile");

    ide.keys("gT"); // the tab before: Untitled-1
    expect(label(ide)).eq("Untitled-1");
    ide.executeCommand("tabs.close");

    ide.executeCommand("textEditor.newUntitledFile");
    expect(label(ide)).eq("Untitled-1");
  });

  it("is not on disk and is not modified while empty", () => {
    const ide = code("|a", { path: "a.txt" });

    ide.executeCommand("textEditor.newUntitledFile");

    expect(ide.document().dirty).eq(false);
  });

  it("is modified once it has text", () => {
    const ide = code("|a", { path: "a.txt" });

    ide.executeCommand("textEditor.newUntitledFile");
    ide.keys("ihello<Esc>");

    expect(ide.document().dirty).eq(true);
  });
});

describe("untitled labels", () => {
  function untitled(text: string) {
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.keys(`i${text}<Esc>`);
    return ide;
  }

  it("uses the first line of the content", () => {
    expect(label(untitled("shopping list<CR>eggs"))).eq("shopping list");
  });

  it("skips empty lines and trims", () => {
    expect(label(untitled("<CR>   notes   <CR>x"))).eq("notes");
  });

  it("cuts long lines at 40 characters", () => {
    expect(label(untitled("x".repeat(60)))).eq("x".repeat(40));
  });

  it("goes back to Untitled-N when the text is deleted", () => {
    const ide = untitled("abc");

    ide.keys("dd");

    expect(label(ide)).eq("Untitled-1");
  });
});

describe("untitled language", () => {
  it("is plain text when nothing hints at a language", () => {
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.keys("ihello<Esc>");

    expect(ide.document().language()).eq("plaintext");
  });

  it("is guessed from a #! line", () => {
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.keys("i#!/usr/bin/env node<CR>console.log(1)<Esc>");

    expect(ide.document().language()).eq("javascript");
  });

  it("changeLanguage sets it, and the guess no longer overrides it", () => {
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.executeCommand("textEditor.changeLanguage", { language: "python" });
    ide.keys("i#!/usr/bin/env node<Esc>");

    expect(ide.document().language()).eq("python");
  });
});

describe("saving an untitled file", () => {
  it("writes it to the given path", () => {
    const root = workspace({});
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.keys("ihello<Esc>");

    ide.executeCommand("textEditor.saveFile", { path: join(root, "notes.txt") });

    expect(readFileSync(join(root, "notes.txt"), "utf8")).eq("hello");
  });

  it("turns the tab into that file", () => {
    const root = workspace({});
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.keys("ihello<Esc>");

    ide.executeCommand("textEditor.saveFile", { path: join(root, "notes.md") });

    expect(ide.document().untitled).eq(false);
    expect(ide.document().dirty).eq(false);
    expect(ide.document().file.path()).eq(join(root, "notes.md"));
    expect(ide.document().language()).eq("markdown");
  });
});

describe("read-only", () => {
  it("readonly_include makes matching files read-only", () => {
    const root = workspace({ "package-lock.json": "{}" });
    const ide = code("|a", { path: "a.txt" }).setting("readonly_include", {
      "**/package-lock.json": true,
    });

    ide.openAndFocus(join(root, "package-lock.json"));
    ide.keys("iZ<Esc>");

    expect(ide.lines()).toEqual(["{}"]);
  });

  it("readonly_exclude wins over readonly_include", () => {
    const root = workspace({ "gen/keep.ts": "abc", "gen/other.ts": "abc" });
    const ide = code("|a", { path: "a.txt" })
      .setting("readonly_include", { "**/gen/**": true })
      .setting("readonly_exclude", { "**/gen/keep.ts": true });

    ide.openAndFocus(join(root, "gen/keep.ts"));
    ide.keys("iZ<Esc>");
    expect(ide.lines()).toEqual(["Zabc"]);

    ide.openAndFocus(join(root, "gen/other.ts"));
    ide.keys("iZ<Esc>");
    expect(ide.lines()).toEqual(["abc"]);
  });

  it("says why nothing happened", () => {
    const root = workspace({ "a.lock": "abc" });
    const ide = code("|a", { path: "a.txt" }).setting("readonly_include", {
      "**/*.lock": true,
    });

    ide.openAndFocus(join(root, "a.lock"));
    ide.keys("iZ<Esc>");

    expect(ide.messages().at(-1)?.text).eq("Cannot edit in read-only editor");
  });

  it("blocks commands that edit too, not only keys", () => {
    const root = workspace({ "a.lock": "abc" });
    const ide = code("|a", { path: "a.txt" }).setting("readonly_include", {
      "**/*.lock": true,
    });

    ide.openAndFocus(join(root, "a.lock"));
    ide.executeCommand("textEditor.deleteLine");

    expect(ide.lines()).toEqual(["abc"]);
  });

  it("still lets the cursor move", () => {
    const root = workspace({ "a.lock": "abc" });
    const ide = code("|a", { path: "a.txt" }).setting("readonly_include", {
      "**/*.lock": true,
    });

    ide.openAndFocus(join(root, "a.lock"));
    ide.keys("l");

    expect(ide.cursor().column).eq(1);
  });

  it("shows [RO] in the status line", () => {
    const root = workspace({ "a.lock": "abc" });
    const ide = code("|a", { path: "a.txt", width: 60 }).setting(
      "readonly_include",
      { "**/*.lock": true },
    );

    ide.openAndFocus(join(root, "a.lock"));

    expect(ide.statusLine()).toContain("[RO]");
  });

  it("toggleReadonly makes the current editor read-only and back", () => {
    const ide = code("|abc", { path: "a.txt" });

    ide.executeCommand("textEditor.toggleReadonly");
    ide.keys("iZ<Esc>");
    expect(ide.lines()).toEqual(["abc"]);

    ide.executeCommand("textEditor.toggleReadonly");
    ide.keys("iZ<Esc>");
    expect(ide.lines()).toEqual(["Zabc"]);
  });

  it("readonly_from_permissions follows the file's write permission", () => {
    const root = workspace({ "locked.txt": "abc" });
    const path = join(root, "locked.txt");
    chmodSync(path, 0o444);
    try {
      const ide = code("|a", { path: "a.txt" }).setting("readonly_from_permissions", true);

      ide.openAndFocus(path);
      ide.keys("iZ<Esc>");

      expect(ide.lines()).toEqual(["abc"]);
    } finally {
      chmodSync(path, 0o644);
    }
  });
});

describe("revert", () => {
  it("reloads the file from disk and clears the modified state", () => {
    const root = workspace({ "a.txt": "abc" });
    const ide = code("|x", { path: "x.txt" });
    ide.openAndFocus(join(root, "a.txt"));
    ide.keys("iZ<Esc>");
    expect(ide.lines()).toEqual(["Zabc"]);

    ide.executeCommand("textEditor.revertFile");

    expect(ide.lines()).toEqual(["abc"]);
    expect(ide.document().dirty).eq(false);
  });

  it("picks up changes made on disk", () => {
    const root = workspace({ "a.txt": "abc" });
    const ide = code("|x", { path: "x.txt" });
    ide.openAndFocus(join(root, "a.txt"));
    writeFileSync(join(root, "a.txt"), "changed\nelsewhere");

    ide.executeCommand("textEditor.revertFile");

    expect(ide.lines()).toEqual(["changed", "elsewhere"]);
  });

  it("keeps the cursor inside the new text", () => {
    const root = workspace({ "a.txt": "one\ntwo\nthree" });
    const ide = code("|x", { path: "x.txt" });
    ide.openAndFocus(join(root, "a.txt"));
    ide.keys("G");
    writeFileSync(join(root, "a.txt"), "one");

    ide.executeCommand("textEditor.revertFile");

    expect(ide.cursor().line).eq(0);
  });

  it("empties an untitled file", () => {
    const ide = code("|a", { path: "a.txt" });
    ide.executeCommand("textEditor.newUntitledFile");
    ide.keys("ihello<Esc>");

    ide.executeCommand("textEditor.revertFile");

    expect(ide.lines()).toEqual([""]);
    expect(ide.document().dirty).eq(false);
  });
});
