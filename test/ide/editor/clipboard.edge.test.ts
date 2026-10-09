import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Edge cases for clipboard and undo (base spec: clipboard.test.ts).

const copy = "textEditor.copy";
const cut = "textEditor.cut";
const paste = "textEditor.paste";

describe("copy and cut", () => {
  it("copy with nothing selected does nothing with emptySelectionClipboard off", () => {
    const ide = code("a|b").setting("empty_selection_clipboard", false);
    ide.clipboard.writeText("before");

    ide.executeCommand(copy);

    expect(ide.clipboard.readText()).eq("before");
  });

  it("cutting the last line removes it and puts the cursor on the line above", () => {
    const ide = code("ab\nc|d").executeCommand(cut);

    expect(ide.lines()).toEqual(["ab"]);
    expect(ide.selections()[0].active.line).eq(0);
    expect(ide.clipboard.readText()).toContain("cd");
  });

  it("copy of a multi-line selection keeps its line breaks", () => {
    const ide = code("«ab\ncd»").executeCommand(copy);

    expect(ide.clipboard.readText()).eq("ab\ncd");
  });
});

describe("paste", () => {
  it("pasting several lines leaves the cursor after the last one", () => {
    const ide = code("|x");
    ide.clipboard.writeText("a\nb");

    expect(ide.executeCommand(paste).state()).eq("a\nb|x");
  });

  it("spreading needs the same number of lines as cursors", () => {
    const ide = code("a|\nb|\nc|");
    ide.clipboard.writeText("x\ny");

    expect(ide.executeCommand(paste).lines()).toEqual(["ax", "y", "bx", "y", "cx", "y"]);
  });

  it("a full line pasted with text selected replaces the selection", () => {
    const ide = code("a|b\ncd").executeCommand(copy);
    ide.setSelections([{ anchor: { line: 1, column: 0 }, active: { line: 1, column: 2 } }]);

    ide.executeCommand(paste);

    expect(ide.lines()).toEqual(["ab", "ab", ""]);
  });

  it("text from outside the editor is never treated as a full line", () => {
    const ide = code("a|b");
    ide.clipboard.writeText("x\n");

    expect(ide.executeCommand(paste).lines()).toEqual(["ax", "b"]);
  });
});

describe("undo grouping", () => {
  it("moving the cursor ends an undo group", () => {
    const ide = code("|").type("a").executeCommand("textEditor.cursorLeft").executeCommand("textEditor.cursorRight").type("b");

    expect(ide.executeCommand("textEditor.undo").state()).eq("a|");
  });

  it("deleting after typing is a separate step", () => {
    const ide = code("|").type("abc").executeCommand("textEditor.deleteLeft");

    expect(ide.executeCommand("textEditor.undo").state()).eq("abc|");
  });

  it("undo puts back the selection that was there", () => {
    expect(code("a«bc»d").type("X").executeCommand("textEditor.undo").state()).eq("a«bc»d");
  });

  it("redo after a new edit does nothing", () => {
    const ide = code("|").type("a").executeCommand("textEditor.undo").type("b");

    expect(ide.executeCommand("textEditor.redo").state()).eq("b|");
  });
});
