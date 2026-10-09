import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyWorkspaceEdit } from "../../../src/Lsp/workspaceEdit.js";
import { workspace } from "../harness.js";
import { code } from "../harness.js";

// Proposed module src/Lsp/workspaceEdit.ts: what rename, code actions and
// refactorings send back (LSP WorkspaceEdit).
//
//   applyWorkspaceEdit(ctx, edit) -> { applied: boolean, failureReason? }
//   edit.changes: { [path]: TextEdit[] }
//   edit.documentChanges: in order, any of
//     { textDocument: { path, version }, edits }   version must match the
//         open document's version (null = any), or nothing is applied
//     { kind: "create", path, options?: { overwrite, ignoreIfExists } }
//     { kind: "rename", oldPath, newPath, options?: { overwrite, ignoreIfExists } }
//     { kind: "delete", path, options?: { recursive, ignoreIfNotExists } }
//   Open documents are edited in their editors (and become modified);
//   files that aren't open are edited on disk.
//
// Rename in the editor: editor.action.rename with { newName }. The provider
// may refuse in prepareRename; the edit is one undo step per file.

const pos = (line: number, character: number) => ({ line, character });
const range = (sl: number, sc: number, el: number, ec: number) => ({ start: pos(sl, sc), end: pos(el, ec) });

describe("text edits", () => {
  it("edits several open documents", () => {
    const ide = code("|foo", { path: "a.ts" });
    ide.openMemoryFile("b.ts", "foo()");

    applyWorkspaceEdit(ide, {
      changes: {
        "a.ts": [{ range: range(0, 0, 0, 3), newText: "bar" }],
        "b.ts": [{ range: range(0, 0, 0, 3), newText: "bar" }],
      },
    });

    const texts = ide.editorGroup().management
      .all()
      .map((w: { buffer(): { content(): string } }) => w.buffer().content());
    expect(texts).toEqual(["bar", "bar()"]);
  });

  it("edits files on disk that aren't open", () => {
    const root = workspace({ "c.ts": "foo" });
    const ide = code("|");

    applyWorkspaceEdit(ide, {
      changes: { [join(root, "c.ts")]: [{ range: range(0, 0, 0, 3), newText: "bar" }] },
    });

    expect(readFileSync(join(root, "c.ts"), "utf8")).eq("bar");
  });

  it("applies when the document version matches", () => {
    const ide = code("|foo", { path: "a.ts" });
    const version = ide.window().document.version;

    const result = applyWorkspaceEdit(ide, {
      documentChanges: [
        { textDocument: { path: "a.ts", version }, edits: [{ range: range(0, 0, 0, 3), newText: "bar" }] },
      ],
    });

    expect(result.applied).eq(true);
    expect(ide.lines()).toEqual(["bar"]);
  });

  it("applies nothing when a version is out of date", () => {
    const ide = code("|foo", { path: "a.ts" });
    const version = ide.window().document.version;
    ide.type("x");

    const result = applyWorkspaceEdit(ide, {
      documentChanges: [
        { textDocument: { path: "a.ts", version }, edits: [{ range: range(0, 0, 0, 1), newText: "y" }] },
      ],
    });

    expect(result.applied).eq(false);
    expect(ide.lines()).toEqual(["xfoo"]);
  });
});

describe("file operations", () => {
  it("creates a file", () => {
    const root = workspace({});
    const ide = code("|");

    applyWorkspaceEdit(ide, { documentChanges: [{ kind: "create", path: join(root, "new.ts") }] });

    expect(existsSync(join(root, "new.ts"))).eq(true);
  });

  it("does not overwrite an existing file unless asked", () => {
    const root = workspace({ "a.ts": "keep" });
    const ide = code("|");

    const result = applyWorkspaceEdit(ide, {
      documentChanges: [{ kind: "create", path: join(root, "a.ts") }],
    });

    expect(result.applied).eq(false);
    expect(readFileSync(join(root, "a.ts"), "utf8")).eq("keep");
  });

  it("ignoreIfExists skips the create without failing", () => {
    const root = workspace({ "a.ts": "keep" });
    const ide = code("|");

    const result = applyWorkspaceEdit(ide, {
      documentChanges: [{ kind: "create", path: join(root, "a.ts"), options: { ignoreIfExists: true } }],
    });

    expect(result.applied).eq(true);
    expect(readFileSync(join(root, "a.ts"), "utf8")).eq("keep");
  });

  it("renames a file", () => {
    const root = workspace({ "a.ts": "x" });
    const ide = code("|");

    applyWorkspaceEdit(ide, {
      documentChanges: [{ kind: "rename", oldPath: join(root, "a.ts"), newPath: join(root, "b.ts") }],
    });

    expect(existsSync(join(root, "a.ts"))).eq(false);
    expect(readFileSync(join(root, "b.ts"), "utf8")).eq("x");
  });

  it("an open editor follows its file when it is renamed", () => {
    const root = workspace({ "a.ts": "x" });
    const ide = code("|");
    ide.openAndFocus(join(root, "a.ts"));

    applyWorkspaceEdit(ide, {
      documentChanges: [{ kind: "rename", oldPath: join(root, "a.ts"), newPath: join(root, "b.ts") }],
    });

    expect(ide.window().document.file.path()).eq(join(root, "b.ts"));
  });

  it("deletes a folder only when recursive", () => {
    const root = workspace({ "dir/a.ts": "x" });
    const ide = code("|");

    const refused = applyWorkspaceEdit(ide, {
      documentChanges: [{ kind: "delete", path: join(root, "dir") }],
    });
    expect(refused.applied).eq(false);

    applyWorkspaceEdit(ide, {
      documentChanges: [{ kind: "delete", path: join(root, "dir"), options: { recursive: true } }],
    });
    expect(existsSync(join(root, "dir"))).eq(false);
  });

  it("runs operations in order: create then edit the new file", () => {
    const root = workspace({});
    const path = join(root, "new.ts");
    const ide = code("|");

    applyWorkspaceEdit(ide, {
      documentChanges: [
        { kind: "create", path },
        { textDocument: { path, version: null }, edits: [{ range: range(0, 0, 0, 0), newText: "hi" }] },
      ],
    });

    expect(readFileSync(path, "utf8")).eq("hi");
  });
});

describe("rename symbol", () => {
  function withRename(prepare?: () => unknown) {
    const ide = code("let fo|o = foo;", { path: "a.ts", width: 100 });
    ide.languages.registerRenameProvider("typescript", {
      prepareRename: prepare,
      provideRenameEdits: (_doc: unknown, _pos: unknown, newName: string) => ({
        changes: {
          "a.ts": [
            { range: range(0, 4, 0, 7), newText: newName },
            { range: range(0, 10, 0, 13), newText: newName },
          ],
        },
      }),
    });
    return ide;
  }

  it("renames every occurrence", () => {
    expect(withRename().executeCommand("language.rename", { newName: "bar" }).lines()).toEqual([
      "let bar = bar;",
    ]);
  });

  it("is one undo step", () => {
    const ide = withRename().executeCommand("language.rename", { newName: "bar" }).executeCommand("textEditor.undo");

    expect(ide.lines()).toEqual(["let foo = foo;"]);
  });

  it("does nothing when prepareRename refuses, and says so", () => {
    const ide = withRename(() => {
      throw new Error("You cannot rename this element.");
    }).executeCommand("language.rename", { newName: "bar" });

    expect(ide.lines()).toEqual(["let foo = foo;"]);
    expect(ide.messages().at(-1)?.text).toContain("cannot rename");
  });
});
