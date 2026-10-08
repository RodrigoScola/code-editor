import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// New lines start with the indentation they need:
// - <CR>, o and O copy the current line's indentation
// - after an opening bracket (in code) one more level
// - typing a closing bracket on an otherwise empty line takes a level off
// - a new line left empty doesn't keep its indentation (Vim autoindent)
// - the indentation unit (tab or N spaces) comes from the file when it
//   already has indented lines
// - == fixes the indentation of a line

const ts = { path: "a.ts" };
const oneLevel = /^(\t| {2,8})/;

describe("keeping indentation", () => {
  it("<CR> keeps the current indentation", () => {
    expect(vim("    fo|o").keys("A<CR>x<Esc>").lines()).toEqual(["    foo", "    x"]);
  });

  it("o keeps the current indentation", () => {
    expect(vim("  |foo").keys("ox<Esc>").lines()).toEqual(["  foo", "  x"]);
  });

  it("O keeps the current indentation", () => {
    expect(vim("  |foo").keys("Ox<Esc>").lines()).toEqual(["  x", "  foo"]);
  });

  it("a new line left empty loses its indentation", () => {
    expect(vim("    fo|o").keys("A<CR><Esc>").lines()).toEqual(["    foo", ""]);
  });
});

describe("indenting code", () => {
  it("indents one more level after {", () => {
    const lines = vim("if (x) |{", ts).keys("A<CR>x<Esc>").lines();

    expect(lines[1]).toMatch(new RegExp(oneLevel.source + "x$"));
  });

  it("puts } on its own line when <CR> is typed between {}", () => {
    const lines = vim("|", ts).keys("i{<CR>x<Esc>").lines();

    expect(lines).length(3);
    expect(lines[0]).eq("{");
    expect(lines[1]).toMatch(new RegExp(oneLevel.source + "x$"));
    expect(lines[2]).eq("}");
  });

  it("typing } on an empty line takes the level back off", () => {
    expect(vim("|{", ts).keys("A<CR>}<Esc>").lines()).toEqual(["{", "}"]);
  });

  it("== fixes a line's indentation", () => {
    const lines = vim("{\n|x\n}", ts).keys("==").lines();

    expect(lines[1]).toMatch(new RegExp(oneLevel.source + "x$"));
  });
});

describe("the indentation unit", () => {
  it("uses two spaces when the file does", () => {
    const ide = vim("function f() {\n  return 1;\n}\n|x", ts);

    expect(ide.keys(">>").lines()[3]).eq("  x");
  });

  it("uses tabs when the file does", () => {
    const ide = vim("function f() {\n\treturn 1;\n}\n|x", ts);

    expect(ide.keys(">>").lines()[3]).eq("\tx");
  });
});
