import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyWorkspaceEdit } from "../../../src/Lsp/workspaceEdit.js";
import { workspace } from "../../ide/harness.js";
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
    const vs = code("|foo", { path: "a.ts" });
    vs.ide.open("b.ts", "foo()");

    applyWorkspaceEdit(vs.ctx, {
      changes: {
        "a.ts": [{ range: range(0, 0, 0, 3), newText: "bar" }],
        "b.ts": [{ range: range(0, 0, 0, 3), newText: "bar" }],
      },
    });

    const texts = vs.ide.group.management
      .all()
      .map((w: { buffer(): { content(): string } }) => w.buffer().content());
    expect(texts).toEqual(["bar", "bar()"]);
  });

  it("edits files on disk that aren't open", () => {
    const root = workspace({ "c.ts": "foo" });
    const vs = code("|");

    applyWorkspaceEdit(vs.ctx, {
      changes: { [join(root, "c.ts")]: [{ range: range(0, 0, 0, 3), newText: "bar" }] },
    });

    expect(readFileSync(join(root, "c.ts"), "utf8")).eq("bar");
  });

  it("applies when the document version matches", () => {
    const vs = code("|foo", { path: "a.ts" });
    const version = vs.window().document.version;

    const result = applyWorkspaceEdit(vs.ctx, {
      documentChanges: [
        { textDocument: { path: "a.ts", version }, edits: [{ range: range(0, 0, 0, 3), newText: "bar" }] },
      ],
    });

    expect(result.applied).eq(true);
    expect(vs.lines()).toEqual(["bar"]);
  });

  it("applies nothing when a version is out of date", () => {
    const vs = code("|foo", { path: "a.ts" });
    const version = vs.window().document.version;
    vs.type("x");

    const result = applyWorkspaceEdit(vs.ctx, {
      documentChanges: [
        { textDocument: { path: "a.ts", version }, edits: [{ range: range(0, 0, 0, 1), newText: "y" }] },
      ],
    });

    expect(result.applied).eq(false);
    expect(vs.lines()).toEqual(["xfoo"]);
  });
});

describe("file operations", () => {
  it("creates a file", () => {
    const root = workspace({});
    const vs = code("|");

    applyWorkspaceEdit(vs.ctx, { documentChanges: [{ kind: "create", path: join(root, "new.ts") }] });

    expect(existsSync(join(root, "new.ts"))).eq(true);
  });

  it("does not overwrite an existing file unless asked", () => {
    const root = workspace({ "a.ts": "keep" });
    const vs = code("|");

    const result = applyWorkspaceEdit(vs.ctx, {
      documentChanges: [{ kind: "create", path: join(root, "a.ts") }],
    });

    expect(result.applied).eq(false);
    expect(readFileSync(join(root, "a.ts"), "utf8")).eq("keep");
  });

  it("ignoreIfExists skips the create without failing", () => {
    const root = workspace({ "a.ts": "keep" });
    const vs = code("|");

    const result = applyWorkspaceEdit(vs.ctx, {
      documentChanges: [{ kind: "create", path: join(root, "a.ts"), options: { ignoreIfExists: true } }],
    });

    expect(result.applied).eq(true);
    expect(readFileSync(join(root, "a.ts"), "utf8")).eq("keep");
  });

  it("renames a file", () => {
    const root = workspace({ "a.ts": "x" });
    const vs = code("|");

    applyWorkspaceEdit(vs.ctx, {
      documentChanges: [{ kind: "rename", oldPath: join(root, "a.ts"), newPath: join(root, "b.ts") }],
    });

    expect(existsSync(join(root, "a.ts"))).eq(false);
    expect(readFileSync(join(root, "b.ts"), "utf8")).eq("x");
  });

  it("an open editor follows its file when it is renamed", () => {
    const root = workspace({ "a.ts": "x" });
    const vs = code("|");
    vs.ide.openFile(join(root, "a.ts"));

    applyWorkspaceEdit(vs.ctx, {
      documentChanges: [{ kind: "rename", oldPath: join(root, "a.ts"), newPath: join(root, "b.ts") }],
    });

    expect(vs.window().document.file.path()).eq(join(root, "b.ts"));
  });

  it("deletes a folder only when recursive", () => {
    const root = workspace({ "dir/a.ts": "x" });
    const vs = code("|");

    const refused = applyWorkspaceEdit(vs.ctx, {
      documentChanges: [{ kind: "delete", path: join(root, "dir") }],
    });
    expect(refused.applied).eq(false);

    applyWorkspaceEdit(vs.ctx, {
      documentChanges: [{ kind: "delete", path: join(root, "dir"), options: { recursive: true } }],
    });
    expect(existsSync(join(root, "dir"))).eq(false);
  });

  it("runs operations in order: create then edit the new file", () => {
    const root = workspace({});
    const path = join(root, "new.ts");
    const vs = code("|");

    applyWorkspaceEdit(vs.ctx, {
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
    const vs = code("let fo|o = foo;", { path: "a.ts", width: 100 });
    vs.ctx.languages.registerRenameProvider("typescript", {
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
    return vs;
  }

  it("renames every occurrence", () => {
    expect(withRename().run("editor.action.rename", { newName: "bar" }).lines()).toEqual([
      "let bar = bar;",
    ]);
  });

  it("is one undo step", () => {
    const vs = withRename().run("editor.action.rename", { newName: "bar" }).run("undo");

    expect(vs.lines()).toEqual(["let foo = foo;"]);
  });

  it("does nothing when prepareRename refuses, and says so", () => {
    const vs = withRename(() => {
      throw new Error("You cannot rename this element.");
    }).run("editor.action.rename", { newName: "bar" });

    expect(vs.lines()).toEqual(["let foo = foo;"]);
    expect(vs.ctx.messages().at(-1)?.text).toContain("cannot rename");
  });
});
