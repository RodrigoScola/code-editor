import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Edge cases for clipboard and undo (base spec: clipboard.test.ts).

const copy = "editor.action.clipboardCopyAction";
const cut = "editor.action.clipboardCutAction";
const paste = "editor.action.clipboardPasteAction";

describe("copy and cut", () => {
  it("copy with nothing selected does nothing with emptySelectionClipboard off", () => {
    const vs = code("a|b").setting("editor.emptySelectionClipboard", false);
    vs.ctx.clipboard.writeText("before");

    vs.run(copy);

    expect(vs.ctx.clipboard.readText()).eq("before");
  });

  it("cutting the last line removes it and puts the cursor on the line above", () => {
    const vs = code("ab\nc|d").run(cut);

    expect(vs.lines()).toEqual(["ab"]);
    expect(vs.selections()[0].active.line).eq(0);
    expect(vs.ctx.clipboard.readText()).toContain("cd");
  });

  it("copy of a multi-line selection keeps its line breaks", () => {
    const vs = code("«ab\ncd»").run(copy);

    expect(vs.ctx.clipboard.readText()).eq("ab\ncd");
  });
});

describe("paste", () => {
  it("pasting several lines leaves the cursor after the last one", () => {
    const vs = code("|x");
    vs.ctx.clipboard.writeText("a\nb");

    expect(vs.run(paste).state()).eq("a\nb|x");
  });

  it("spreading needs the same number of lines as cursors", () => {
    const vs = code("a|\nb|\nc|");
    vs.ctx.clipboard.writeText("x\ny");

    expect(vs.run(paste).lines()).toEqual(["ax", "y", "bx", "y", "cx", "y"]);
  });

  it("a full line pasted with text selected replaces the selection", () => {
    const vs = code("a|b\ncd").run(copy);
    vs.window().setSelections([{ anchor: { line: 1, column: 0 }, active: { line: 1, column: 2 } }]);

    vs.run(paste);

    expect(vs.lines()).toEqual(["ab", "ab", ""]);
  });

  it("text from outside the editor is never treated as a full line", () => {
    const vs = code("a|b");
    vs.ctx.clipboard.writeText("x\n");

    expect(vs.run(paste).lines()).toEqual(["ax", "b"]);
  });
});

describe("undo grouping", () => {
  it("moving the cursor ends an undo group", () => {
    const vs = code("|").type("a").run("cursorLeft").run("cursorRight").type("b");

    expect(vs.run("undo").state()).eq("a|");
  });

  it("deleting after typing is a separate step", () => {
    const vs = code("|").type("abc").run("deleteLeft");

    expect(vs.run("undo").state()).eq("abc|");
  });

  it("undo puts back the selection that was there", () => {
    expect(code("a«bc»d").type("X").run("undo").state()).eq("a«bc»d");
  });

  it("redo after a new edit does nothing", () => {
    const vs = code("|").type("a").run("undo").type("b");

    expect(vs.run("redo").state()).eq("b|");
  });
});
