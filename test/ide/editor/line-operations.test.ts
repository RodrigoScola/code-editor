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
    expect(exec("a|b\ncd", "editor.action.copyLinesDownAction")).eq("ab\na|b\ncd");
  });

  it("copyLinesUp duplicates the line above and keeps the cursor on the upper copy", () => {
    expect(exec("a|b\ncd", "editor.action.copyLinesUpAction")).eq("a|b\nab\ncd");
  });

  it("copies every line the selection touches", () => {
    expect(exec("«ab\ncd»\nef", "editor.action.copyLinesDownAction")).eq(
      "ab\ncd\n«ab\ncd»\nef",
    );
  });
});

describe("move lines", () => {
  it("moveLinesDown swaps the line with the one below", () => {
    expect(exec("a|b\ncd", "editor.action.moveLinesDownAction")).eq("cd\na|b");
  });

  it("moveLinesUp swaps the line with the one above", () => {
    expect(exec("ab\nc|d", "editor.action.moveLinesUpAction")).eq("c|d\nab");
  });

  it("does nothing at the edge of the file", () => {
    expect(exec("a|b\ncd", "editor.action.moveLinesUpAction")).eq("a|b\ncd");
    expect(exec("ab\nc|d", "editor.action.moveLinesDownAction")).eq("ab\nc|d");
  });

  it("moves all the selected lines together", () => {
    expect(exec("«ab\ncd»\nef", "editor.action.moveLinesDownAction")).eq("ef\n«ab\ncd»");
  });
});

describe("delete and insert lines", () => {
  it("deleteLines removes the line and keeps the column on the next one", () => {
    expect(exec("ab\nc|d\nef", "editor.action.deleteLines")).eq("ab\ne|f");
  });

  it("deleteLines on the last line moves up", () => {
    expect(exec("ab\nc|d", "editor.action.deleteLines")).eq("a|b");
  });

  it("insertLineAfter opens a line below without splitting the current one", () => {
    expect(exec("a|b\ncd", "editor.action.insertLineAfter")).eq("ab\n|\ncd");
  });

  it("insertLineAfter keeps the indentation", () => {
    expect(exec("  a|b", "editor.action.insertLineAfter")).eq("  ab\n  |");
  });

  it("insertLineBefore opens a line above", () => {
    expect(exec("ab\nc|d", "editor.action.insertLineBefore")).eq("ab\n|\ncd");
  });

  it("insertLineBefore keeps the indentation", () => {
    expect(exec("  c|d", "editor.action.insertLineBefore")).eq("  |\n  cd");
  });
});

describe("join lines", () => {
  it("joins the next line with one space and drops its indentation", () => {
    expect(code("a|b\n   cd").run("editor.action.joinLines").lines()).toEqual(["ab cd"]);
  });

  it("joins every selected line", () => {
    expect(code("«a\nb\nc»").run("editor.action.joinLines").lines()).toEqual(["a b c"]);
  });

  it("does not add a space when the next line is empty", () => {
    expect(code("a|b\n\ncd").run("editor.action.joinLines").lines()).toEqual(["ab", "cd"]);
  });
});

describe("transpose and duplicate", () => {
  it("transposeLetters swaps the characters around the cursor and moves right", () => {
    expect(exec("ab|c", "editor.action.transposeLetters")).eq("acb|");
  });

  it("at the end of a line it swaps the two characters before the cursor", () => {
    expect(exec("abc|", "editor.action.transposeLetters")).eq("acb|");
  });

  it("duplicateSelection duplicates the selected text after it", () => {
    expect(exec("«ab»c", "editor.action.duplicateSelection")).eq("ab«ab»c");
  });

  it("duplicateSelection with nothing selected duplicates the line", () => {
    expect(exec("a|b", "editor.action.duplicateSelection")).eq("ab\na|b");
  });
});

describe("selecting lines", () => {
  it("expandLineSelection selects the whole line and its line break", () => {
    expect(exec("a|b\ncd", "expandLineSelection")).eq("«ab\n»cd");
  });

  it("pressing it again adds the next line", () => {
    expect(exec("a|b\ncd\nef", "expandLineSelection", "expandLineSelection")).eq(
      "«ab\ncd\n»ef",
    );
  });
});

describe("indent and outdent", () => {
  it("indentLines adds one level wherever the cursor is", () => {
    expect(exec("a|b", "editor.action.indentLines")).eq("    a|b");
  });

  it("outdentLines removes one level", () => {
    expect(exec("    a|b", "editor.action.outdentLines")).eq("a|b");
  });

  it("indents every selected line", () => {
    expect(code("«a\nb»").run("editor.action.indentLines").lines()).toEqual(["    a", "    b"]);
  });
});

describe("delete all left and right", () => {
  it("deleteAllLeft deletes from the start of the line to the cursor", () => {
    expect(exec("ab|cd", "deleteAllLeft")).eq("|cd");
  });

  it("deleteAllRight deletes from the cursor to the end of the line", () => {
    expect(exec("ab|cd", "deleteAllRight")).eq("ab|");
  });
});

describe("sorting and cleaning lines", () => {
  it("sortLinesAscending sorts the selected lines", () => {
    expect(code("«c\na\nb»").run("editor.action.sortLinesAscending").lines()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("sortLinesDescending sorts them the other way", () => {
    expect(code("«a\nc\nb»").run("editor.action.sortLinesDescending").lines()).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("only sorts the selected lines", () => {
    expect(code("z\n«c\na»\nb").run("editor.action.sortLinesAscending").lines()).toEqual([
      "z",
      "a",
      "c",
      "b",
    ]);
  });

  it("reverseLines reverses the selected lines", () => {
    expect(code("«a\nb\nc»").run("editor.action.reverseLines").lines()).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("removeDuplicateLines keeps the first of each repeated line", () => {
    expect(code("«a\nb\na\nb»").run("editor.action.removeDuplicateLines").lines()).toEqual([
      "a",
      "b",
    ]);
  });

  it("trimTrailingWhitespace trims every line", () => {
    expect(code("a  \nb\t\n|c").run("editor.action.trimTrailingWhitespace").lines()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
