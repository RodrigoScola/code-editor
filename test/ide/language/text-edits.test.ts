import { describe, expect, it } from "vitest";
import { TextBuffer } from "../../../src/ui/buffer/Buffer.js";
import { applyTextEdits } from "../../../src/Lsp/textEdits.js";
import { vim } from "../harness.js";

// Proposed module src/Lsp/textEdits.ts. Rename, format, code actions and
// completion all come back from a language server as text edits:
//   { range: { start: { line, character }, end }, newText }
// Lines and characters are 0-based, characters in UTF-16 code units (what
// JS string indexes already are). Every edit in one batch refers to the
// text before any of them is applied; overlapping edits are an error.
//
//   applyTextEdits(buffer, edits)
//   codeWindow.applyEdits(edits)   the same, undoable as one change, with
//                                  the cursor kept on the same text

const pos = (line: number, character: number) => ({ line, character });
const edit = (sl: number, sc: number, el: number, ec: number, newText: string) => ({
  range: { start: pos(sl, sc), end: pos(el, ec) },
  newText,
});

function apply(text: string, edits: ReturnType<typeof edit>[]) {
  const buffer = new TextBuffer(text);
  applyTextEdits(buffer, edits);
  return buffer.content();
}

describe("applyTextEdits", () => {
  it("replaces text on a line", () => {
    expect(apply("let foo = 1;", [edit(0, 4, 0, 7, "bar")])).eq("let bar = 1;");
  });

  it("inserts with an empty range", () => {
    expect(apply("ab", [edit(0, 1, 0, 1, "X")])).eq("aXb");
  });

  it("deletes with empty new text", () => {
    expect(apply("abc", [edit(0, 0, 0, 2, "")])).eq("c");
  });

  it("replaces across lines", () => {
    expect(apply("a\nb\nc", [edit(0, 1, 2, 0, "-")])).eq("a-c");
  });

  it("inserts new lines", () => {
    expect(apply("ac", [edit(0, 1, 0, 1, "\nb\n")])).eq("a\nb\nc");
  });

  it("applies several edits by their original positions", () => {
    expect(
      apply("abcdef", [edit(0, 0, 0, 1, "XX"), edit(0, 4, 0, 5, "Y")]),
    ).eq("XXbcdYf");
  });

  it("does not care about the order the edits come in", () => {
    expect(
      apply("abcdef", [edit(0, 4, 0, 5, "Y"), edit(0, 0, 0, 1, "XX")]),
    ).eq("XXbcdYf");
  });

  it("applies edits on different lines", () => {
    expect(
      apply("foo\nbar\nfoo", [edit(0, 0, 0, 3, "baz"), edit(2, 0, 2, 3, "baz")]),
    ).eq("baz\nbar\nbaz");
  });

  it("throws on overlapping edits", () => {
    expect(() => apply("abcdef", [edit(0, 0, 0, 3, "X"), edit(0, 2, 0, 4, "Y")])).toThrow();
  });

  it("counts characters in UTF-16 code units", () => {
    // 😀 is two code units, so character 2 is right after it
    expect(apply("😀a", [edit(0, 2, 0, 2, "X")])).eq("😀Xa");
  });
});

describe("applying edits in the editor", () => {
  it("is undone in one step", () => {
    const ide = vim("|foo foo");

    ide.window().applyEdits([edit(0, 0, 0, 3, "bar"), edit(0, 4, 0, 7, "bar")]);
    expect(ide.lines()).toEqual(["bar bar"]);

    expect(ide.keys("u").lines()).toEqual(["foo foo"]);
  });

  it("keeps the cursor on the same text", () => {
    const ide = vim("ab|c");

    ide.window().applyEdits([edit(0, 0, 0, 0, "XX")]);

    expect(ide.text()).eq("XXab|c");
  });

  it("marks the document as modified", () => {
    const ide = vim("|abc");

    ide.window().applyEdits([edit(0, 0, 0, 1, "X")]);

    expect(ide.document().dirty).eq(true);
  });
});
