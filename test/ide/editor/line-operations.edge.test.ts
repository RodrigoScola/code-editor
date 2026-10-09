import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Edge cases for line commands (base spec: line-operations.test.ts).

describe("which lines a selection covers", () => {
  it("a selection ending at column 0 doesn't include that line", () => {
    expect(code("«ab\n»cd").executeCommand("textEditor.copyLinesDown").lines()).toEqual(["ab", "ab", "cd"]);
  });

  it("deleteLines with two cursors on one line deletes it once", () => {
    expect(code("a|b|c\nd").executeCommand("textEditor.deleteLines").lines()).toEqual(["d"]);
  });

  it("copyLinesDown with cursors on two lines copies each", () => {
    expect(code("a|\nb|").executeCommand("textEditor.copyLinesDown").lines()).toEqual(["a", "a", "b", "b"]);
  });

  it("moveLinesDown with a selection ending at column 0 moves only the lines above", () => {
    expect(code("«a\n»b\nc").executeCommand("textEditor.moveLinesDown").lines()).toEqual(["b", "a", "c"]);
  });
});

describe("edges of the file", () => {
  it("joinLines on the last line does nothing", () => {
    expect(exec("a\nb|", "textEditor.joinLines")).eq("a\nb|");
  });

  it("transposeLetters at the start of a line does nothing", () => {
    expect(exec("|abc", "textEditor.transposeLetters")).eq("|abc");
  });

  it("deleteLines on the only line leaves one empty line", () => {
    expect(code("a|bc").executeCommand("textEditor.deleteLines").lines()).toEqual([""]);
  });

  it("copyLinesUp on the first line", () => {
    expect(exec("a|b", "textEditor.copyLinesUp")).eq("a|b\nab");
  });
});

describe("cleaning up", () => {
  it("trimTrailingWhitespace empties a line that is only white space", () => {
    expect(code("|a\n   \nb").executeCommand("textEditor.trimTrailingWhitespace").lines()).toEqual(["a", "", "b"]);
  });

  it("deleteAllLeft with a selection deletes just the selection", () => {
    expect(exec("a«bc»d", "textEditor.deleteAllLeft")).eq("a|d");
  });

  it("indentLines with tabs inserts a tab", () => {
    expect(code("|a").setting("expand_tab", false).executeCommand("textEditor.indentLines").lines()).toEqual([
      "\ta",
    ]);
  });

  it("outdentLines removes at most one level", () => {
    expect(code("  |a").executeCommand("textEditor.outdentLines").lines()).toEqual(["a"]);
  });

  it("insertLineAfter with two cursors opens a line under each", () => {
    expect(code("a|\nb|").executeCommand("textEditor.insertLineBelow").lines()).toEqual(["a", "", "b", ""]);
  });

  it("sorted lines move the selection with them", () => {
    expect(code("«b\na»").executeCommand("textEditor.sortLinesAscending").state()).eq("«a\nb»");
  });
});
