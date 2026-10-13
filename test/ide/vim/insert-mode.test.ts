import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// Entering insert mode and typing in it. In insert mode "|" is the insertion
// point. Leaving with <Esc> moves the cursor one left, onto the last typed
// character (except at column 0).
//
// In insert mode the cursor can stand after the last character of a line
// (normal mode can't). The arrows move without leaving insert mode and,
// as in Vim, <Left>/<Right> don't wrap to the next or previous line. With
// Shift they select (as in VS Code): «» mark the selection, « the anchor
// and » the cursor, and typing, <BS>, <Del> or <CR> replace it.
// Auto-indent on <CR> is in test/ide/editor/auto-indent.test.ts, <C-r> in
// registers, counts (3ia) in repeat, visual c in visual-mode.
//
// A start text with "|" after the last character ("ab|") puts the cursor at
// the end of the line, so "i" there types at the end the way "A" does. The
// specs for <Del>, <C-w> and the rest use that, so they don't depend on A.

describe("entering insert mode", () => {
  it("i inserts before the cursor", () => {
    expect(after("a|bc", "iX<Esc>")).eq("a|Xbc");
  });

  it("a appends after the cursor", () => {
    expect(after("a|bc", "aX<Esc>")).eq("ab|Xc");
  });

  it("a on the last character appends at the end", () => {
    expect(after("ab|c", "aX<Esc>")).eq("abc|X");
  });

  it("I inserts before the first non-blank", () => {
    expect(after("  foo|bar", "IX<Esc>")).eq("  |Xfoobar");
  });

  it("A appends at the end of the line", () => {
    expect(after("fo|o", "AX<Esc>")).eq("foo|X");
  });

  it("o opens a line below", () => {
    expect(after("|a\nb", "ox<Esc>")).eq("a\n|x\nb");
  });

  it("O opens a line above", () => {
    expect(after("a\n|b", "Ox<Esc>")).eq("a\n|x\nb");
  });
});

describe("leaving insert mode", () => {
  it("<Esc> goes back to normal mode", () => {
    expect(vim("|").keys("ihi<Esc>").mode()).eq("normal");
  });

  it("<Esc> moves the cursor onto the last typed character", () => {
    expect(after("|", "ihello<Esc>")).eq("hell|o");
  });

  it("<Esc> at column 0 stays at column 0", () => {
    expect(after("|abc", "i<Esc>")).eq("|abc");
  });
});

describe("typing", () => {
  it("<CR> splits the line at the cursor", () => {
    expect(after("foo|bar", "i<CR><Esc>")).eq("foo\n|bar");
  });

  it("<CR> at the end of a line opens an empty line below", () => {
    expect(vim("fo|o").keys("A<CR>x<Esc>").lines()).toEqual(["foo", "x"]);
  });

  it("<BS> deletes the character before the cursor", () => {
    expect(after("ab|c", "i<BS><Esc>")).eq("|ac");
  });

  it("<BS> at the start of a line joins it with the line above", () => {
    expect(after("foo\n|bar", "i<BS><Esc>")).eq("fo|obar");
  });

  it("<C-w> deletes the word before the cursor", () => {
    expect(after("foo ba|r", "A<C-w><Esc>")).eq("foo| ");
  });

  it("<C-u> deletes everything before the cursor on the line", () => {
    expect(after("foo |bar", "i<C-u><Esc>")).eq("|bar");
  });

  it("typed text with capitals", () => {
    expect(vim("|").keys("iHello World<Esc>").lines()).toEqual(["Hello World"]);
  });
});

describe("the cursor while typing", () => {
  it("each typed character moves it right", () => {
    const ide = vim("|").keys("iabc");

    expect(ide.text()).eq("abc|");
    expect(ide.cursor()).toMatchObject({ line: 0, column: 3 });
  });

  it("typing in the middle pushes the rest of the line right", () => {
    expect(after("ab|cd", "iXY")).eq("abXY|cd");
  });

  it("A puts it after the last character", () => {
    const ide = vim("fo|o").keys("A");

    expect(ide.mode()).eq("insert");
    expect(ide.cursor().column).eq(3);
  });

  it("a on an empty line stays at column 0", () => {
    expect(after("|", "aX")).eq("X|");
  });

  it("<CR> moves it to the start of the new line", () => {
    const ide = vim("foo|bar").keys("i<CR>");

    expect(ide.text()).eq("foo\n|bar");
    expect(ide.cursor()).toMatchObject({ line: 1, column: 0 });
  });

  it("<CR> twice leaves an empty line between", () => {
    expect(after("ab|", "i<CR><CR>X")).eq("ab\n\nX|");
  });

  it("<BS> moves it back over the deleted character", () => {
    expect(after("ab|c", "i<BS>")).eq("a|c");
  });

  it("<BS> joining lines leaves it where they meet", () => {
    const ide = vim("foo\n|bar").keys("i<BS>");

    expect(ide.text()).eq("foo|bar");
    expect(ide.cursor()).toMatchObject({ line: 0, column: 3 });
  });

  it("<BS> at the start of the document does nothing", () => {
    const ide = vim("|abc").keys("i<BS>");

    expect(ide.text()).eq("|abc");
    expect(ide.mode()).eq("insert");
  });

  it("typing then <BS> on every character gets back the original line", () => {
    expect(after("a|b", "ixyz<BS><BS><BS>")).eq("a|b");
  });

  it("typing on the last line of several", () => {
    expect(after("a\nb\n|c", "iX")).eq("a\nb\nX|c");
  });
});

describe("moving in insert mode", () => {
  it("<Left> moves back without leaving insert mode", () => {
    const ide = vim("ab|c").keys("i<Left>X");

    expect(ide.text()).eq("aX|bc");
    expect(ide.mode()).eq("insert");
  });

  it("<Right> moves forward", () => {
    expect(after("|abc", "i<Right>X")).eq("aX|bc");
  });

  it("<Right> can go after the last character, and no further", () => {
    expect(after("a|b", "i<Right><Right><Right>X")).eq("abX|");
  });

  it("<Left> at column 0 stays there", () => {
    expect(after("|ab", "i<Left>X")).eq("X|ab");
  });

  it("<Left> doesn't wrap to the line above", () => {
    expect(after("a\n|b", "i<Left>X")).eq("a\nX|b");
  });

  it("<Right> doesn't wrap to the line below", () => {
    expect(after("a|\nb", "i<Right>X")).eq("aX|\nb");
  });

  it("<Up> keeps the column", () => {
    expect(after("abcd\nx|y", "i<Up>Z")).eq("aZ|bcd\nxy");
  });

  it("<Down> onto a shorter line goes to its end", () => {
    expect(after("ab|cd\nx", "i<Down>Z")).eq("abcd\nxZ|");
  });

  it("<Down> past a short line comes back to the column", () => {
    expect(after("abc|d\nx\nabcd", "i<Down><Down>Z")).eq("abcd\nx\nabcZ|d");
  });

  it("<Up> on the first line stays on it", () => {
    expect(after("a|b\nc", "i<Up>X")).eq("aX|b\nc");
  });

  it("<Down> on the last line stays on it", () => {
    expect(after("a\nb|c", "i<Down>X")).eq("a\nbX|c");
  });

  it("<Home> goes to column 0", () => {
    expect(after("  fo|o", "i<Home>X")).eq("X|  foo");
  });

  it("<End> goes after the last character", () => {
    expect(after("f|oo", "i<End>X")).eq("fooX|");
  });

  it("<Esc> after <End> lands on the last character", () => {
    expect(after("f|oo", "i<End><Esc>")).eq("fo|o");
  });

  it("moving starts a new undo step", () => {
    const ide = vim("|").keys("iab<Left>c<Esc>");
    expect(ide.lines()).toEqual(["acb"]);

    ide.keys("u");

    expect(ide.lines()).toEqual(["ab"]);
  });
});

describe("deleting in insert mode", () => {
  it("<Del> deletes the character after the cursor", () => {
    expect(after("a|bc", "i<Del>")).eq("a|c");
  });

  it("<Del> at the end of a line joins the next line", () => {
    expect(after("ab|\ncd", "i<Del>")).eq("ab|cd");
  });

  it("<Del> at the end of the document does nothing", () => {
    expect(after("ab|", "i<Del>")).eq("ab|");
  });

  it("<C-h> is <BS>", () => {
    expect(after("ab|c", "i<C-h>")).eq("a|c");
  });

  it("<C-w> deletes the spaces before the word too", () => {
    expect(after("foo bar  |", "i<C-w>")).eq("foo |");
  });

  it("<C-w> at column 0 joins with the line above", () => {
    expect(after("foo\n|bar", "i<C-w>")).eq("foo|bar");
  });
});

describe("other insert mode keys", () => {
  it("<Tab> inserts a tab when expand_tab is off", () => {
    const ide = vim("|a").setting("expand_tab", false);

    expect(ide.keys("i<Tab>").text()).eq("\t|a");
  });

  it("<Tab> with expand_tab fills spaces to the next tab stop", () => {
    const ide = vim("a|b").setting("expand_tab", true).setting("tab_width", 4);

    expect(ide.keys("i<Tab>").text()).eq("a   |b");
  });

  it("<C-t> indents the line and keeps the cursor on its text", () => {
    const ide = vim("fo|o").setting("expand_tab", true).setting("tab_width", 2);

    expect(ide.keys("i<C-t>").text()).eq("  fo|o");
  });

  it("<C-d> takes one indent level off", () => {
    const ide = vim("    fo|o").setting("expand_tab", true).setting("tab_width", 2);

    expect(ide.keys("i<C-d>").text()).eq("  fo|o");
  });

  it("<C-o> runs one normal mode command, then goes back to insert", () => {
    const ide = vim("foo bar|").keys("i<C-o>0X");

    expect(ide.text()).eq("X|foo bar");
    expect(ide.mode()).eq("insert");
  });

  it("<C-y> copies the character above the cursor", () => {
    expect(after("abc\n|", "i<C-y><C-y>")).eq("abc\nab|");
  });

  it("<C-e> copies the character below the cursor", () => {
    expect(after("|\nabc", "i<C-e><C-e>")).eq("ab|\nabc");
  });

  it("gi goes back to where insert mode was left", () => {
    expect(after("ab|c\nxyz", "iX<Esc>jgiY<Esc>")).eq("abX|Yc\nxyz");
  });
});

describe("selecting with Shift in insert mode", () => {
  it("<S-Right> selects from the cursor", () => {
    expect(vim("a|bcd").keys("i<S-Right><S-Right>").state()).eq("a«bc»d");
  });

  it("<S-Left> selects backwards", () => {
    expect(vim("abc|d").keys("i<S-Left><S-Left>").state()).eq("a»bc«d");
  });

  it("going back over the anchor turns the selection around", () => {
    expect(vim("ab|cd").keys("i<S-Right><S-Left><S-Left>").state()).eq("a»b«cd");
  });

  it("back to the anchor leaves no selection", () => {
    const ide = vim("ab|cd").keys("i<S-Right>");
    expect(ide.state()).eq("ab«c»d");

    expect(ide.keys("<S-Left>").state()).eq("ab|cd");
  });

  it("<S-End> selects to the end of the line", () => {
    expect(vim("a|bc").keys("i<S-End>").state()).eq("a«bc»");
  });

  it("<S-Home> selects to the start of the line", () => {
    expect(vim("ab|c").keys("i<S-Home>").state()).eq("»ab«c");
  });

  it("<S-Down> selects to the same column on the next line", () => {
    expect(vim("a|bc\ndef").keys("i<S-Down>").state()).eq("a«bc\nd»ef");
  });

  it("<S-Up> selects to the same column on the line above", () => {
    expect(vim("abc\nde|f").keys("i<S-Up>").state()).eq("ab»c\nde«f");
  });

  it("<S-Right> at the end of a line selects the line break", () => {
    expect(vim("ab|\ncd").keys("i<S-Right>").state()).eq("ab«\n»cd");
  });

  it("stays in insert mode", () => {
    const ide = vim("a|bcd").keys("i<S-Right>");

    expect(ide.state()).eq("a«b»cd");
    expect(ide.mode()).eq("insert");
  });
});

describe("editing a Shift selection", () => {
  it("typing replaces it", () => {
    expect(vim("a|bcd").keys("i<S-Right><S-Right>X").state()).eq("aX|d");
  });

  it("typing replaces a backwards selection", () => {
    expect(vim("abc|d").keys("i<S-Left><S-Left>X").state()).eq("aX|d");
  });

  it("only the first character replaces it, the rest is typed after", () => {
    expect(vim("a|bcd").keys("i<S-Right><S-Right>XYZ").state()).eq("aXYZ|d");
  });

  it("<BS> deletes it", () => {
    expect(vim("a|bcd").keys("i<S-Right><S-Right><BS>").state()).eq("a|d");
  });

  it("<Del> deletes it, not the character after it", () => {
    expect(vim("a|bcd").keys("i<S-Right><S-Right><Del>").state()).eq("a|d");
  });

  it("<CR> replaces it with a line break", () => {
    expect(vim("a|bcd").keys("i<S-Right><S-Right><CR>").state()).eq("a\n|d");
  });

  it("typing over a selection across lines joins what is left", () => {
    expect(vim("a|b\ncd").keys("i<S-Down>X").state()).eq("aX|d");
  });

  it("deleting a selected line break joins the lines", () => {
    expect(vim("ab|\ncd").keys("i<S-Right><BS>").lines()).toEqual(["abcd"]);
  });

  // each of these first checks the selection is there, so they can't pass
  // while Shift+arrows do nothing
  const selected = () => {
    const ide = vim("a|bcd").keys("i<S-Right><S-Right>");
    expect(ide.state()).eq("a«bc»d");
    return ide;
  };

  it("<Left> drops it and goes to its start", () => {
    expect(selected().keys("<Left>").state()).eq("a|bcd");
  });

  it("<Right> drops it and goes to its end", () => {
    expect(selected().keys("<Right>").state()).eq("abc|d");
  });

  it("<Esc> drops it and goes back to normal mode", () => {
    const ide = selected().keys("<Esc>");

    expect(ide.mode()).eq("normal");
    expect(ide.state()).not.toContain("«");
    expect(ide.lines()).toEqual(["abcd"]);
  });

  it("u takes back the typing and brings back the text", () => {
    const ide = vim("a|bcd").keys("i<S-Right><S-Right>X<Esc>");
    expect(ide.lines()).toEqual(["aXd"]);

    ide.keys("u");

    expect(ide.lines()).toEqual(["abcd"]);
  });
});
