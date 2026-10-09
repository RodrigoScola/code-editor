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

const copy = "editor.action.clipboardCopyAction";
const cut = "editor.action.clipboardCutAction";
const paste = "editor.action.clipboardPasteAction";

describe("copy and cut", () => {
  it("copy puts the selection on the clipboard", () => {
    const vs = code("a«bc»d").run(copy);

    expect(vs.ctx.clipboard.readText()).eq("bc");
  });

  it("copy with nothing selected copies the whole line", () => {
    const vs = code("a|b\ncd").run(copy);

    expect(vs.ctx.clipboard.readText()).eq("ab\n");
  });

  it("cut removes the selection", () => {
    const vs = code("a«bc»d").run(cut);

    expect(vs.state()).eq("a|d");
    expect(vs.ctx.clipboard.readText()).eq("bc");
  });

  it("cut with nothing selected cuts the whole line", () => {
    const vs = code("a|b\ncd").run(cut);

    expect(vs.lines()).toEqual(["cd"]);
    expect(vs.ctx.clipboard.readText()).eq("ab\n");
  });

  it("copy with several selections joins them with line breaks", () => {
    const vs = code("«a» x «b»").run(copy);

    expect(vs.ctx.clipboard.readText()).eq("a\nb");
  });
});

describe("paste", () => {
  it("replaces the selection", () => {
    const vs = code("a«bc»d");
    vs.ctx.clipboard.writeText("X");

    expect(vs.run(paste).state()).eq("aX|d");
  });

  it("a whole line copied with nothing selected is pasted above the current line", () => {
    const vs = code("a|b\ncd").run(copy);
    vs.window().setSelections([{ anchor: { line: 1, column: 1 }, active: { line: 1, column: 1 } }]);

    vs.run(paste);

    expect(vs.lines()).toEqual(["ab", "ab", "cd"]);
  });

  it("spreads one line to each cursor when the counts match", () => {
    const vs = code("a|\nb|");
    vs.ctx.clipboard.writeText("x\ny");

    expect(vs.run(paste).state()).eq("ax|\nby|");
  });

  it("pastes everything at every cursor with multiCursorPaste full", () => {
    const vs = code("a|\nb|").setting("editor.multiCursorPaste", "full");
    vs.ctx.clipboard.writeText("x\ny");

    expect(vs.run(paste).lines()).toEqual(["ax", "y", "bx", "y"]);
  });
});

describe("undo and redo", () => {
  it("undoes consecutive typing in one step", () => {
    const vs = code("|").type("a").type("b").type("c");

    expect(vs.run("undo").state()).eq("|");
  });

  it("redo puts it back", () => {
    const vs = code("|").type("a").type("b").run("undo");

    expect(vs.run("redo").state()).eq("ab|");
  });

  it("a paste is its own undo step", () => {
    const vs = code("|").type("a");
    vs.ctx.clipboard.writeText("XY");
    vs.run(paste);

    expect(vs.run("undo").state()).eq("a|");
  });

  it("cursorUndo goes back to the previous cursor position", () => {
    expect(code("ab|c").run("cursorEnd").run("cursorUndo").state()).eq("ab|c");
  });
});
