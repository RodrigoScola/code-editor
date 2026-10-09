import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Multiple cursors (VS Code "Basic Editing > Multiple selections").
//   editor.action.insertCursorAbove / insertCursorBelow    Ctrl+Alt+Up/Down
//   editor.action.addSelectionToNextFindMatch              Ctrl+D
//   editor.action.moveSelectionToNextFindMatch             Ctrl+K Ctrl+D
//   editor.action.selectHighlights                         Ctrl+Shift+L
//   editor.action.insertCursorAtEndOfEachLineSelected      Shift+Alt+I
//   editor.action.addCursorsToBottom / addCursorsToTop
//   cursorUndo / cursorRedo                                Ctrl+U
//   removeSecondaryCursors                                 Esc
// Every edit command applies to every cursor; cursors that end up at the
// same place merge into one.

describe("adding cursors above and below", () => {
  it("insertCursorBelow adds a cursor on the next line, same column", () => {
    expect(exec("a|bc\ndef", "textEditor.addCursorBelow")).eq("a|bc\nd|ef");
  });

  it("insertCursorAbove adds a cursor on the previous line", () => {
    expect(exec("abc\nd|ef", "textEditor.addCursorAbove")).eq("a|bc\nd|ef");
  });

  it("insertCursorBelow on the last line does nothing", () => {
    expect(exec("abc\nd|ef", "textEditor.addCursorBelow")).eq("abc\nd|ef");
  });

  it("can be repeated", () => {
    expect(
      exec("a|bc\ndef\nghi", "textEditor.addCursorBelow", "textEditor.addCursorBelow"),
    ).eq("a|bc\nd|ef\ng|hi");
  });

  it("addCursorsToBottom adds a cursor on every line below", () => {
    expect(exec("a|bc\ndef\nghi", "textEditor.addCursorsToBottom")).eq("a|bc\nd|ef\ng|hi");
  });

  it("addCursorsToTop adds a cursor on every line above", () => {
    expect(exec("abc\ndef\ng|hi", "textEditor.addCursorsToTop")).eq("a|bc\nd|ef\ng|hi");
  });
});

describe("Ctrl+D: add selection to next find match", () => {
  const next = "textEditor.addSelectionToNextMatch";

  it("with an empty selection, first selects the word under the cursor", () => {
    expect(exec("f|oo bar foo", next)).eq("«foo» bar foo");
  });

  it("then adds the next occurrence", () => {
    expect(exec("f|oo bar foo", next, next)).eq("«foo» bar «foo»");
  });

  it("wraps around to the start of the file", () => {
    expect(exec("foo bar «foo»", next)).eq("«foo» bar «foo»");
  });

  it("when it started from the word under the cursor, only matches whole words", () => {
    expect(exec("f|oo food foo", next, next)).eq("«foo» food «foo»");
  });

  it("when it started from a selection, matches inside words too", () => {
    expect(exec("«foo» food", next)).eq("«foo» «foo»d");
  });

  it("finds occurrences on other lines", () => {
    expect(exec("«ab»\nx ab", next)).eq("«ab»\nx «ab»");
  });

  it("does nothing more once every occurrence is selected", () => {
    expect(exec("«ab» «ab»", next)).eq("«ab» «ab»");
  });
});

describe("Ctrl+K Ctrl+D: move selection to next find match", () => {
  it("moves the last selection to the next occurrence instead of adding one", () => {
    expect(exec("«foo» bar foo", "textEditor.moveSelectionToNextMatch")).eq(
      "foo bar «foo»",
    );
  });
});

describe("Ctrl+Shift+L: select all occurrences", () => {
  it("selects every occurrence of the word under the cursor", () => {
    expect(exec("f|oo bar foo\nfoo", "textEditor.selectAllMatches")).eq(
      "«foo» bar «foo»\n«foo»",
    );
  });

  it("selects every occurrence of the selected text", () => {
    expect(exec("«a-» a-b a-", "textEditor.selectAllMatches")).eq("«a-» «a-»b «a-»");
  });
});

describe("Shift+Alt+I: cursor at the end of each selected line", () => {
  it("puts a cursor at the end of every line in the selection", () => {
    expect(exec("«ab\ncd\nef»", "textEditor.addCursorsToLineEnds")).eq(
      "ab|\ncd|\nef|",
    );
  });
});

describe("editing with several cursors", () => {
  it("typing goes to every cursor", () => {
    expect(code("a|b\nc|d").type("X").state()).eq("aX|b\ncX|d");
  });

  it("typing replaces every selection", () => {
    expect(code("«ab» «ab»").type("c").state()).eq("c| c|");
  });

  it("deleteLeft deletes before every cursor", () => {
    expect(code("ab|c\nde|f").executeCommand("textEditor.deleteLeft").state()).eq("a|c\nd|f");
  });

  it("cursors that meet merge into one", () => {
    expect(code("a|b|c").executeCommand("textEditor.deleteLeft").executeCommand("textEditor.deleteLeft").state()).eq("|c");
  });

  it("cursor movement moves every cursor", () => {
    expect(code("a|bc\nd|ef").executeCommand("textEditor.cursorRight").state()).eq("ab|c\nde|f");
  });
});

describe("getting back to one cursor", () => {
  it("removeSecondaryCursors keeps only the primary cursor", () => {
    expect(exec("a|b c|d", "textEditor.removeSecondaryCursors")).eq("a|b cd");
  });

  it("cursorUndo undoes the last cursor change", () => {
    const ide = code("f|oo bar foo")
      .executeCommand("textEditor.addSelectionToNextMatch")
      .executeCommand("textEditor.addSelectionToNextMatch");
    expect(ide.state()).eq("«foo» bar «foo»");

    expect(ide.executeCommand("textEditor.cursorUndo").state()).eq("«foo» bar foo");
  });

  it("cursorRedo redoes it", () => {
    const ide = code("f|oo bar foo")
      .executeCommand("textEditor.addSelectionToNextMatch")
      .executeCommand("textEditor.addSelectionToNextMatch")
      .executeCommand("textEditor.cursorUndo");

    expect(ide.executeCommand("textEditor.cursorRedo").state()).eq("«foo» bar «foo»");
  });
});
