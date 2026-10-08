import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// Entering insert mode and typing in it. In insert mode "|" is the insertion
// point. Leaving with <Esc> moves the cursor one left, onto the last typed
// character (except at column 0).

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
