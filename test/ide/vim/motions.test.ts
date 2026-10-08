import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// Cursor motions in normal mode. "|" is the cursor (on the character after
// it). Behavior follows Vim; :help motion.txt has the details.

const lines = (count: number) =>
  Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");

describe("word motions", () => {
  it("e goes to the end of the word", () => {
    expect(after("|foo bar", "e")).eq("fo|o bar");
  });

  it("e from the end of a word goes to the end of the next one", () => {
    expect(after("fo|o bar", "e")).eq("foo ba|r");
  });

  it("e treats punctuation as its own word", () => {
    const ide = vim("|foo.bar");

    expect(ide.keys("e").text()).eq("fo|o.bar");
    expect(ide.keys("e").text()).eq("foo|.bar");
    expect(ide.keys("e").text()).eq("foo.ba|r");
  });

  it("e continues on the next line", () => {
    expect(after("fo|o\nbar", "e")).eq("foo\nba|r");
  });

  it("E goes to the end of a WORD (punctuation included)", () => {
    expect(after("|foo.bar baz", "E")).eq("foo.ba|r baz");
  });

  it("B goes back to the start of a WORD", () => {
    expect(after("foo.bar |baz", "B")).eq("|foo.bar baz");
  });

  it("ge goes back to the end of the previous word", () => {
    expect(after("foo |bar", "ge")).eq("fo|o bar");
  });

  it("b at the start of a line goes to the start of the last word above", () => {
    expect(after("foo\n|bar", "b")).eq("|foo\nbar");
  });

  it("b at the very start of the file stays put", () => {
    expect(after("|foo bar", "b")).eq("|foo bar");
  });

  it("w stops on an empty line", () => {
    expect(after("|foo\n\nbar", "w")).eq("foo\n|\nbar");
  });
});

describe("line motions", () => {
  it("^ goes to the first non-blank character", () => {
    expect(after("  foo b|ar", "^")).eq("  |foo bar");
  });

  it("g_ goes to the last non-blank character", () => {
    expect(after("|foo bar  ", "g_")).eq("foo ba|r  ");
  });

  it("0 goes to column 0", () => {
    expect(after("  foo b|ar", "0")).eq("|  foo bar");
  });

  it("$ goes to the last character", () => {
    expect(after("|foo bar", "$")).eq("foo ba|r");
  });

  it("after $, j and k stay at the end of each line", () => {
    expect(after("ab|c\nabcdef", "$j")).eq("abc\nabcde|f");
  });

  it("j keeps the column it started from across a shorter line", () => {
    expect(after("abc|d\nx\nabcdef", "jj")).eq("abcd\nx\nabc|def");
  });

  it("h does not wrap to the line above", () => {
    expect(after("a\n|b", "h")).eq("a\n|b");
  });

  it("l does not move past the last character", () => {
    expect(after("a|b", "l")).eq("a|b");
  });
});

describe("find on the line", () => {
  it("f jumps to the next occurrence of a character", () => {
    expect(after("|foo bar", "fb")).eq("foo |bar");
  });

  it("t jumps to just before it", () => {
    expect(after("|foo bar", "tb")).eq("foo| bar");
  });

  it("F jumps back to it", () => {
    expect(after("foo ba|r", "Fo")).eq("fo|o bar");
  });

  it("T jumps back to just after it", () => {
    expect(after("foo ba|r", "To")).eq("foo| bar");
  });

  it("; repeats the last find", () => {
    expect(after("|a,b,c", "f,;")).eq("a,b|,c");
  });

  it(", repeats the last find backwards", () => {
    expect(after("|a,b,c", "f,;,")).eq("a|,b,c");
  });

  it("does not move when the character is not there", () => {
    // the failed fz must not break the fc after it
    expect(after("|abc", "fzfc")).eq("ab|c");
  });

  it("does not look past the end of the line", () => {
    expect(after("|ab\ncd", "fcfb")).eq("a|b\ncd");
  });

  it("takes a count", () => {
    expect(after("|a-b-c-d", "2f-")).eq("a-b|-c-d");
  });
});

describe("% bracket matching", () => {
  it("jumps from an opening bracket to its match", () => {
    expect(after("|(a [b] c)", "%")).eq("(a [b] c|)");
  });

  it("jumps back from the closing bracket", () => {
    expect(after("(a [b] c|)", "%")).eq("|(a [b] c)");
  });

  it("skips nested pairs", () => {
    expect(after("|(a (b) c)", "%")).eq("(a (b) c|)");
  });

  it("works across lines", () => {
    expect(after("|{\n  x\n}", "%")).eq("{\n  x\n|}");
  });

  it("finds the next bracket on the line when not on one", () => {
    expect(after("a|b (c)", "%")).eq("ab (c|)");
  });
});

describe("paragraph motions", () => {
  it("} goes to the next blank line", () => {
    expect(after("|a\nb\n\nc\nd", "}")).eq("a\nb\n|\nc\nd");
  });

  it("{ goes to the previous blank line", () => {
    expect(after("a\nb\n\nc\n|d", "{")).eq("a\nb\n|\nc\nd");
  });
});

describe("counts", () => {
  it("3j moves three lines", () => {
    expect(vim("|a\nb\nc\nd").keys("3j").cursor().line).eq(3);
  });

  it("2k moves two lines up", () => {
    expect(vim("a\nb\n|c").keys("2k").cursor().line).eq(0);
  });

  it("2w moves two words", () => {
    expect(after("|foo bar baz qux", "2w")).eq("foo bar |baz qux");
  });

  it("a count past the end stops at the last line", () => {
    expect(vim("|a\nb\nc").keys("5j").cursor().line).eq(2);
  });

  it("a count past the end of the line stops at the last character", () => {
    expect(after("|abc", "5l")).eq("ab|c");
  });
});

describe("going to a line", () => {
  it("G goes to the last line", () => {
    expect(vim("|a\nb\nc").keys("G").cursor().line).eq(2);
  });

  it("gg goes to the first line", () => {
    expect(vim("a\nb\n|c").keys("gg").cursor().line).eq(0);
  });

  it("5G goes to line 5", () => {
    expect(vim(lines(10)).keys("5G").cursor().line).eq(4);
  });

  it("3gg goes to line 3", () => {
    expect(vim(lines(10)).keys("3gg").cursor().line).eq(2);
  });
});
