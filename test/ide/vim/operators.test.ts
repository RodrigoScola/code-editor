import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// Operators (d c y > < ~ ...) combined with motions, plus the single-key
// edits (x X r J p P ...). Behavior follows Vim (:help change.txt).

describe("deleting characters", () => {
  it("x deletes the character under the cursor", () => {
    expect(after("a|bc", "x")).eq("a|c");
  });

  it("x on the last character moves the cursor left", () => {
    expect(after("ab|c", "x")).eq("a|b");
  });

  it("x on an empty line does nothing", () => {
    expect(after("|", "x")).eq("|");
  });

  it("X deletes the character before the cursor", () => {
    expect(after("ab|c", "X")).eq("a|c");
  });
});

describe("d with a motion", () => {
  it("dw deletes to the start of the next word", () => {
    expect(after("foo |bar baz", "dw")).eq("foo |baz");
  });

  it("dw on the last word deletes to the end of the line", () => {
    expect(after("foo |bar", "dw")).eq("foo| ");
  });

  it("de deletes to the end of the word", () => {
    expect(after("|foo bar", "de")).eq("| bar");
  });

  it("d$ deletes to the end of the line", () => {
    expect(after("foo |bar baz", "d$")).eq("foo| ");
  });

  it("D is d$", () => {
    expect(after("foo |bar baz", "D")).eq("foo| ");
  });

  it("d0 deletes to the start of the line", () => {
    expect(after("foo |bar", "d0")).eq("|bar");
  });

  it("dj deletes this line and the next", () => {
    expect(after("|a\nb\nc", "dj")).eq("|c");
  });

  it("dk deletes this line and the previous", () => {
    expect(after("a\n|b\nc", "dk")).eq("|c");
  });

  it("dG deletes to the end of the file", () => {
    expect(after("a\n|b\nc", "dG")).eq("|a");
  });

  it("dgg deletes to the start of the file", () => {
    expect(after("a\n|b\nc", "dgg")).eq("|c");
  });
});

describe("dd", () => {
  it("deletes the line", () => {
    expect(after("a\n|b\nc", "dd")).eq("a\n|c");
  });

  it("on the last line moves the cursor up", () => {
    expect(after("a\n|b", "dd")).eq("|a");
  });

  it("on the only line leaves one empty line", () => {
    const ide = vim("|abc").keys("dd");

    expect(ide.lines()).toEqual([""]);
    expect(ide.text()).eq("|");
  });

  it("takes a count", () => {
    expect(after("|a\nb\nc\nd", "3dd")).eq("|d");
  });
});

describe("change", () => {
  it("cw changes to the end of the word (like ce)", () => {
    const ide = vim("|foo bar").keys("cw");

    expect(ide.mode()).eq("insert");
    expect(ide.keys("baz<Esc>").text()).eq("ba|z bar");
  });

  it("cw on the last word", () => {
    expect(after("foo |bar", "cwx<Esc>")).eq("foo |x");
  });

  it("C changes to the end of the line", () => {
    expect(after("foo |bar", "Cx<Esc>")).eq("foo |x");
  });

  it("cc changes the whole line", () => {
    expect(after("|foo\nbar", "ccbaz<Esc>")).eq("ba|z\nbar");
  });

  it("s changes one character", () => {
    expect(after("|abc", "sX<Esc>")).eq("|Xbc");
  });

  it("S changes the whole line", () => {
    expect(after("|abc\nd", "SX<Esc>")).eq("|X\nd");
  });
});

describe("replace and case", () => {
  it("r replaces one character and stays in normal mode", () => {
    const ide = vim("|abc").keys("rx");

    expect(ide.text()).eq("|xbc");
    expect(ide.mode()).eq("normal");
  });

  it("3r replaces three and ends on the last one", () => {
    expect(after("|abcd", "3rx")).eq("xx|xd");
  });

  it("~ toggles case and moves right", () => {
    expect(after("|abc", "~")).eq("A|bc");
  });

  it("3~ toggles three characters", () => {
    expect(after("|abcd", "3~")).eq("ABC|d");
  });
});

describe("joining lines", () => {
  it("J joins with the next line using one space", () => {
    expect(after("|foo\n  bar", "J")).eq("foo| bar");
  });

  it("3J joins three lines", () => {
    expect(after("|a\nb\nc\nd", "3J")).eq("a b| c\nd");
  });
});

describe("indenting", () => {
  it(">> indents the line by one level", () => {
    const ide = vim("|foo").keys(">>");

    expect(ide.lines()[0]).toMatch(/^(\t| {2,8})foo$/);
  });

  it("<< undoes >>", () => {
    const ide = vim("|foo").keys(">>");
    expect(ide.lines()[0]).not.eq("foo");

    expect(ide.keys("<lt><lt>").lines()).toEqual(["foo"]);
  });

  it("<< on an unindented line does nothing", () => {
    expect(vim("|foo").keys("<lt><lt>").lines()).toEqual(["foo"]);
  });
});

describe("yank and put", () => {
  it("yy then p puts the line below", () => {
    expect(after("|a\nb", "yyp")).eq("a\n|a\nb");
  });

  it("yy then P puts the line above", () => {
    expect(after("a\n|b", "yyP")).eq("a\n|b\nb");
  });

  it("linewise put lands on the first non-blank of the new line", () => {
    expect(after("|  a\nb", "yyp")).eq("  a\n  |a\nb");
  });

  it("yl then p puts the character after the cursor", () => {
    expect(after("|ab", "ylp")).eq("a|ab");
  });

  it("charwise put leaves the cursor on the last pasted character", () => {
    expect(after("|foo bar", "yw$p")).eq("foo barfoo| ");
  });

  it("y does not change the text", () => {
    expect(vim("|foo bar").keys("yw").lines()).toEqual(["foo bar"]);
  });

  it("ddp swaps two lines", () => {
    expect(after("|a\nb", "ddp")).eq("b\n|a");
  });

  it("xp swaps two characters", () => {
    expect(after("|ab", "xp")).eq("b|a");
  });
});
