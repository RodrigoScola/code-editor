import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Line commands from VS Code's Basic Editing and Selection menus.
//   editor.action.copyLinesUpAction / copyLinesDownAction    Shift+Alt+Up/Down
//   editor.action.moveLinesUpAction / moveLinesDownAction    Alt+Up/Down
//   editor.action.deleteLines                                Ctrl+Shift+K
//   editor.action.insertLineAfter / insertLineBefore         Ctrl+Enter / Ctrl+Shift+Enter
//   editor.action.joinLines                                  Ctrl+J
//   editor.action.transposeLetters                           Ctrl+T
//   editor.action.duplicateSelection
//   expandLineSelection                                      Ctrl+L
//   editor.action.indentLines / outdentLines                 Ctrl+] / Ctrl+[
//   deleteAllLeft / deleteAllRight
//   editor.action.sortLinesAscending / sortLinesDescending
//   editor.action.reverseLines, editor.action.removeDuplicateLines
//   editor.action.trimTrailingWhitespace                     Ctrl+K Ctrl+X

describe("copy lines", () => {
  it("copyLinesDown duplicates the line below and moves the cursor to the copy", () => {
    expect(exec("a|b\ncd", "textEditor.copyLinesDown")).eq("ab\na|b\ncd");
  });

  it("copyLinesUp duplicates the line above and keeps the cursor on the upper copy", () => {
    expect(exec("a|b\ncd", "textEditor.copyLinesUp")).eq("a|b\nab\ncd");
  });

  it("copies every line the selection touches", () => {
    expect(exec("«ab\ncd»\nef", "textEditor.copyLinesDown")).eq(
      "ab\ncd\n«ab\ncd»\nef",
    );
  });
});

describe("move lines", () => {
  it("moveLinesDown swaps the line with the one below", () => {
    expect(exec("a|b\ncd", "textEditor.moveLinesDown")).eq("cd\na|b");
  });

  it("moveLinesUp swaps the line with the one above", () => {
    expect(exec("ab\nc|d", "textEditor.moveLinesUp")).eq("c|d\nab");
  });

  it("does nothing at the edge of the file", () => {
    expect(exec("a|b\ncd", "textEditor.moveLinesUp")).eq("a|b\ncd");
    expect(exec("ab\nc|d", "textEditor.moveLinesDown")).eq("ab\nc|d");
  });

  it("moves all the selected lines together", () => {
    expect(exec("«ab\ncd»\nef", "textEditor.moveLinesDown")).eq("ef\n«ab\ncd»");
  });
});

describe("delete and insert lines", () => {
  it("deleteLines removes the line and keeps the column on the next one", () => {
    expect(exec("ab\nc|d\nef", "textEditor.deleteLines")).eq("ab\ne|f");
  });

  it("deleteLines on the last line moves up", () => {
    expect(exec("ab\nc|d", "textEditor.deleteLines")).eq("a|b");
  });

  it("insertLineAfter opens a line below without splitting the current one", () => {
    expect(exec("a|b\ncd", "textEditor.insertLineBelow")).eq("ab\n|\ncd");
  });

  it("insertLineAfter keeps the indentation", () => {
    expect(exec("  a|b", "textEditor.insertLineBelow")).eq("  ab\n  |");
  });

  it("insertLineBefore opens a line above", () => {
    expect(exec("ab\nc|d", "textEditor.insertLineAbove")).eq("ab\n|\ncd");
  });

  it("insertLineBefore keeps the indentation", () => {
    expect(exec("  c|d", "textEditor.insertLineAbove")).eq("  |\n  cd");
  });
});

describe("join lines", () => {
  it("joins the next line with one space and drops its indentation", () => {
    expect(code("a|b\n   cd").executeCommand("textEditor.joinLines").lines()).toEqual(["ab cd"]);
  });

  it("joins every selected line", () => {
    expect(code("«a\nb\nc»").executeCommand("textEditor.joinLines").lines()).toEqual(["a b c"]);
  });

  it("does not add a space when the next line is empty", () => {
    expect(code("a|b\n\ncd").executeCommand("textEditor.joinLines").lines()).toEqual(["ab", "cd"]);
  });
});

describe("transpose and duplicate", () => {
  it("transposeLetters swaps the characters around the cursor and moves right", () => {
    expect(exec("ab|c", "textEditor.transposeLetters")).eq("acb|");
  });

  it("at the end of a line it swaps the two characters before the cursor", () => {
    expect(exec("abc|", "textEditor.transposeLetters")).eq("acb|");
  });

  it("duplicateSelection duplicates the selected text after it", () => {
    expect(exec("«ab»c", "textEditor.duplicateSelection")).eq("ab«ab»c");
  });

  it("duplicateSelection with nothing selected duplicates the line", () => {
    expect(exec("a|b", "textEditor.duplicateSelection")).eq("ab\na|b");
  });
});

describe("selecting lines", () => {
  it("expandLineSelection selects the whole line and its line break", () => {
    expect(exec("a|b\ncd", "textEditor.selectLine")).eq("«ab\n»cd");
  });

  it("pressing it again adds the next line", () => {
    expect(exec("a|b\ncd\nef", "textEditor.selectLine", "textEditor.selectLine")).eq(
      "«ab\ncd\n»ef",
    );
  });
});

describe("indent and outdent", () => {
  it("indentLines adds one level wherever the cursor is", () => {
    expect(exec("a|b", "textEditor.indentLines")).eq("    a|b");
  });

  it("outdentLines removes one level", () => {
    expect(exec("    a|b", "textEditor.outdentLines")).eq("a|b");
  });

  it("indents every selected line", () => {
    expect(code("«a\nb»").executeCommand("textEditor.indentLines").lines()).toEqual(["    a", "    b"]);
  });
});

describe("delete all left and right", () => {
  it("deleteAllLeft deletes from the start of the line to the cursor", () => {
    expect(exec("ab|cd", "textEditor.deleteAllLeft")).eq("|cd");
  });

  it("deleteAllRight deletes from the cursor to the end of the line", () => {
    expect(exec("ab|cd", "textEditor.deleteAllRight")).eq("ab|");
  });
});

describe("sorting and cleaning lines", () => {
  it("sortLinesAscending sorts the selected lines", () => {
    expect(code("«c\na\nb»").executeCommand("textEditor.sortLinesAscending").lines()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("sortLinesDescending sorts them the other way", () => {
    expect(code("«a\nc\nb»").executeCommand("textEditor.sortLinesDescending").lines()).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("only sorts the selected lines", () => {
    expect(code("z\n«c\na»\nb").executeCommand("textEditor.sortLinesAscending").lines()).toEqual([
      "z",
      "a",
      "c",
      "b",
    ]);
  });

  it("reverseLines reverses the selected lines", () => {
    expect(code("«a\nb\nc»").executeCommand("textEditor.reverseLines").lines()).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("removeDuplicateLines keeps the first of each repeated line", () => {
    expect(code("«a\nb\na\nb»").executeCommand("textEditor.removeDuplicateLines").lines()).toEqual([
      "a",
      "b",
    ]);
  });

  it("trimTrailingWhitespace trims every line", () => {
    expect(code("a  \nb\t\n|c").executeCommand("textEditor.trimTrailingWhitespace").lines()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
