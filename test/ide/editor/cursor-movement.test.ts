import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// VS Code's cursor and delete commands (the non-Vim way to move around).
//   cursorLeft/Right/Up/Down, cursorHome/End, cursorTop/Bottom
//   cursorWordLeft (start of word), cursorWordEndRight, cursorWordStartRight
//   ...Select variants extend the selection
//   deleteLeft / deleteRight, deleteWordLeft / deleteWordRight
// Words follow editor.wordSeparators: punctuation runs are words of their
// own.

describe("moving by character and line", () => {
  it("cursorRight and cursorLeft", () => {
    expect(exec("a|bc", "cursorRight")).eq("ab|c");
    expect(exec("a|bc", "cursorLeft")).eq("|abc");
  });

  it("cursorLeft with a selection collapses it to its start", () => {
    expect(exec("a«bc»d", "cursorLeft")).eq("a|bcd");
  });

  it("cursorRight with a selection collapses it to its end", () => {
    expect(exec("a«bc»d", "cursorRight")).eq("abc|d");
  });

  it("cursorRight at the end of a line goes to the next line", () => {
    expect(exec("ab|\ncd", "cursorRight")).eq("ab\n|cd");
  });

  it("cursorDown keeps the column it started from across a short line", () => {
    expect(exec("abc|d\nx\nabcdef", "cursorDown", "cursorDown")).eq("abcd\nx\nabc|def");
  });

  it("cursorDown on the last line goes to its end", () => {
    expect(exec("a|bc", "cursorDown")).eq("abc|");
  });

  it("cursorUp on the first line goes to its start", () => {
    expect(exec("ab|c", "cursorUp")).eq("|abc");
  });
});

describe("home and end", () => {
  it("cursorHome goes to the first non-blank character", () => {
    expect(exec("    ab|c", "cursorHome")).eq("    |abc");
  });

  it("pressing it again goes to column 0", () => {
    expect(exec("    ab|c", "cursorHome", "cursorHome")).eq("|    abc");
  });

  it("cursorEnd goes to the end of the line", () => {
    expect(exec("a|bc", "cursorEnd")).eq("abc|");
  });

  it("cursorTop and cursorBottom go to the ends of the file", () => {
    expect(exec("ab\nc|d", "cursorTop")).eq("|ab\ncd");
    expect(exec("a|b\ncd", "cursorBottom")).eq("ab\ncd|");
  });
});

describe("moving by word", () => {
  it("cursorWordEndRight goes to the end of the word", () => {
    expect(exec("|foo bar", "cursorWordEndRight")).eq("foo| bar");
    expect(exec("|foo bar", "cursorWordEndRight", "cursorWordEndRight")).eq("foo bar|");
  });

  it("cursorWordStartRight goes to the start of the next word", () => {
    expect(exec("|foo bar", "cursorWordStartRight")).eq("foo |bar");
  });

  it("cursorWordLeft goes to the start of the word", () => {
    expect(exec("foo bar|", "cursorWordLeft")).eq("foo |bar");
    expect(exec("foo bar|", "cursorWordLeft", "cursorWordLeft")).eq("|foo bar");
  });

  it("punctuation is a word of its own", () => {
    expect(exec("|foo.bar", "cursorWordEndRight", "cursorWordEndRight")).eq("foo.|bar");
  });
});

describe("selecting while moving", () => {
  it("cursorRightSelect extends the selection", () => {
    expect(exec("a|bc", "cursorRightSelect")).eq("a«b»c");
  });

  it("cursorEndSelect selects to the end of the line", () => {
    expect(exec("a|bc", "cursorEndSelect")).eq("a«bc»");
  });

  it("cursorHomeSelect selects back to the first non-blank", () => {
    expect(exec("  ab|c", "cursorHomeSelect")).eq("  »ab«c");
  });

  it("cursorWordLeftSelect selects back a word", () => {
    expect(exec("foo bar|", "cursorWordLeftSelect")).eq("foo »bar«");
  });
});

describe("deleting", () => {
  it("deleteLeft deletes the character before the cursor", () => {
    expect(exec("ab|c", "deleteLeft")).eq("a|c");
  });

  it("deleteLeft at the start of a line joins it to the line above", () => {
    expect(exec("ab\n|c", "deleteLeft")).eq("ab|c");
  });

  it("deleteRight deletes the character after the cursor", () => {
    expect(exec("a|bc", "deleteRight")).eq("a|c");
  });

  it("deleteRight at the end of a line joins the next line", () => {
    expect(exec("ab|\nc", "deleteRight")).eq("ab|c");
  });

  it("deleteLeft deletes the selection", () => {
    expect(exec("a«bc»d", "deleteLeft")).eq("a|d");
  });

  it("deleteWordLeft deletes back to the start of the word", () => {
    expect(exec("foo bar|", "deleteWordLeft")).eq("foo |");
  });

  it("deleteWordRight deletes to the end of the word", () => {
    expect(exec("|foo bar", "deleteWordRight")).eq("| bar");
  });

  it("deleteLeft right after typing ( removes the ) that came with it", () => {
    expect(code("|").type("(").run("deleteLeft").state()).eq("|");
  });
});
