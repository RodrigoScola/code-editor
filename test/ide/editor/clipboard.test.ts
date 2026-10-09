import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Clipboard and undo, VS Code style.
//   editor.action.clipboardCopyAction / clipboardCutAction / clipboardPasteAction
// With nothing selected, copy and cut take the whole line (and its line
// break); pasting such a "full line" copy with nothing selected puts it
// above the current line instead of at the cursor.
// With several cursors, a paste whose line count matches the cursor count
// gives one line to each cursor (editor.multiCursorPaste: "spread");
// "full" pastes everything at every cursor.
// Consecutive typing is undone in one step. cursorUndo undoes cursor moves.

const copy = "textEditor.copy";
const cut = "textEditor.cut";
const paste = "textEditor.paste";

describe("copy and cut", () => {
  it("copy puts the selection on the clipboard", () => {
    const ide = code("a«bc»d").executeCommand(copy);

    expect(ide.clipboard.readText()).eq("bc");
  });

  it("copy with nothing selected copies the whole line", () => {
    const ide = code("a|b\ncd").executeCommand(copy);

    expect(ide.clipboard.readText()).eq("ab\n");
  });

  it("cut removes the selection", () => {
    const ide = code("a«bc»d").executeCommand(cut);

    expect(ide.state()).eq("a|d");
    expect(ide.clipboard.readText()).eq("bc");
  });

  it("cut with nothing selected cuts the whole line", () => {
    const ide = code("a|b\ncd").executeCommand(cut);

    expect(ide.lines()).toEqual(["cd"]);
    expect(ide.clipboard.readText()).eq("ab\n");
  });

  it("copy with several selections joins them with line breaks", () => {
    const ide = code("«a» x «b»").executeCommand(copy);

    expect(ide.clipboard.readText()).eq("a\nb");
  });
});

describe("paste", () => {
  it("replaces the selection", () => {
    const ide = code("a«bc»d");
    ide.clipboard.writeText("X");

    expect(ide.executeCommand(paste).state()).eq("aX|d");
  });

  it("a whole line copied with nothing selected is pasted above the current line", () => {
    const ide = code("a|b\ncd").executeCommand(copy);
    ide.setSelections([{ anchor: { line: 1, column: 1 }, active: { line: 1, column: 1 } }]);

    ide.executeCommand(paste);

    expect(ide.lines()).toEqual(["ab", "ab", "cd"]);
  });

  it("spreads one line to each cursor when the counts match", () => {
    const ide = code("a|\nb|");
    ide.clipboard.writeText("x\ny");

    expect(ide.executeCommand(paste).state()).eq("ax|\nby|");
  });

  it("pastes everything at every cursor with multiCursorPaste full", () => {
    const ide = code("a|\nb|").setting("multi_cursor_paste", "full");
    ide.clipboard.writeText("x\ny");

    expect(ide.executeCommand(paste).lines()).toEqual(["ax", "y", "bx", "y"]);
  });
});

describe("undo and redo", () => {
  it("undoes consecutive typing in one step", () => {
    const ide = code("|").type("a").type("b").type("c");

    expect(ide.executeCommand("textEditor.undo").state()).eq("|");
  });

  it("redo puts it back", () => {
    const ide = code("|").type("a").type("b").executeCommand("textEditor.undo");

    expect(ide.executeCommand("textEditor.redo").state()).eq("ab|");
  });

  it("a paste is its own undo step", () => {
    const ide = code("|").type("a");
    ide.clipboard.writeText("XY");
    ide.executeCommand(paste);

    expect(ide.executeCommand("textEditor.undo").state()).eq("a|");
  });

  it("cursorUndo goes back to the previous cursor position", () => {
    expect(code("ab|c").executeCommand("textEditor.cursorEnd").executeCommand("textEditor.cursorUndo").state()).eq("ab|c");
  });
});
