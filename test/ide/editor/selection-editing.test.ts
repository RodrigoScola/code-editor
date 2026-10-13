import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Editing with a selection, the way it works in VS Code (and most editors):
// the selection is replaced by whatever you type or paste, and deleted by
// Backspace or Delete. Vim's visual mode operators are in
// test/ide/vim/visual-mode.test.ts.
//
//   textEditor.type (args { text })   typing replaces the selection
//   textEditor.deleteLeft / deleteRight   delete the selection, not a
//     character next to it
//   textEditor.selectAll   VS Code: editor.action.selectAll, Ctrl+A
//   textEditor.undo / redo   bring the text and the selection back
//
// Built on screen.deleteSelection / replaceSelection
// (test/unit/editor/selection/selection-model.test.ts).
//
// «» mark a selection, « the anchor and » the cursor.

describe("deleting a selection", () => {
  it("deleteLeft removes it", () => {
    expect(exec("a«bc»d", "textEditor.deleteLeft")).eq("a|d");
  });

  it("deleteRight removes it too, not the character after it", () => {
    expect(exec("a«bc»d", "textEditor.deleteRight")).eq("a|d");
  });

  it("works when it was selected backwards", () => {
    expect(exec("a»bc«d", "textEditor.deleteLeft")).eq("a|d");
  });

  it("across lines joins what is left", () => {
    expect(exec("ab«c\nde\nf»gh", "textEditor.deleteLeft")).eq("ab|gh");
  });

  it("a selection of whole lines removes the lines", () => {
    expect(exec("one\n«two\nthree\n»four", "textEditor.deleteLeft")).eq("one\n|four");
  });

  it("a selected line break joins two lines", () => {
    expect(exec("ab«\n»cd", "textEditor.deleteLeft")).eq("ab|cd");
  });

  it("deleting everything leaves one empty line", () => {
    const ide = code("«abc\ndef»").executeCommand("textEditor.deleteLeft");

    expect(ide.lines()).toEqual([""]);
    expect(ide.state()).eq("|");
  });

  it("marks the document modified", () => {
    const ide = code("a«bc»d").executeCommand("textEditor.deleteLeft");

    expect(ide.document().dirty).eq(true);
  });
});

describe("typing over a selection", () => {
  it("replaces it", () => {
    expect(code("a«bc»d").type("X").state()).eq("aX|d");
  });

  it("replaces a selection across lines", () => {
    expect(code("ab«c\nde»f").type("X").state()).eq("abX|f");
  });

  it("typing a line break replaces it with the break", () => {
    expect(code("ab«cd»ef").type("\n").lines()).toEqual(["ab", "ef"]);
  });

  it("typing several lines puts the cursor after the last one", () => {
    expect(code("a«b»c").type("1\n2").state()).eq("a1\n2|c");
  });

  it("only the first character replaces it; the rest is typed after", () => {
    expect(code("a«bc»d").type("X").type("Y").state()).eq("aXY|d");
  });
});

describe("select all", () => {
  it("selects the whole document", () => {
    expect(exec("a|b\ncd", "textEditor.selectAll")).eq("«ab\ncd»");
  });

  it("then typing replaces everything", () => {
    expect(code("a|b\ncd").executeCommand("textEditor.selectAll").type("X").state()).eq("X|");
  });
});

describe("undo and redo", () => {
  it("undo brings back the deleted text and the selection", () => {
    const ide = code("a«bc»d").executeCommand("textEditor.deleteLeft");
    expect(ide.state()).eq("a|d");

    ide.executeCommand("textEditor.undo");

    expect(ide.state()).eq("a«bc»d");
  });

  it("undo after typing over a selection takes it back in one step", () => {
    const ide = code("a«bc»d").type("X");
    expect(ide.state()).eq("aX|d");

    ide.executeCommand("textEditor.undo");

    expect(ide.state()).eq("a«bc»d");
  });

  it("redo deletes it again", () => {
    const ide = code("a«bc»d").executeCommand("textEditor.deleteLeft").executeCommand("textEditor.undo");

    ide.executeCommand("textEditor.redo");

    expect(ide.state()).eq("a|d");
  });
});

describe("in Vim insert mode", () => {
  // a selection made by a command, then Backspace typed in insert mode
  it("<BS> deletes the selection", () => {
    const ide = code("a«bc»d");

    ide.keys("i<BS><Esc>");

    expect(ide.lines()).toEqual(["ad"]);
  });

  it("typing a character replaces the selection", () => {
    const ide = code("a«bc»d");

    ide.keys("iX<Esc>");

    expect(ide.lines()).toEqual(["aXd"]);
  });
});
