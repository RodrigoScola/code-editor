import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// gc{motion} / gcc toggle line comments, using the comment string of the
// file's language (Neovim's built-in commenting, vim-commentary):
// - the comment goes after the indentation
// - if any line in the range is not commented, all of them get commented
// - blank lines are left alone

const ts = { path: "a.ts" };

describe("toggling comments", () => {
  it("gcc comments the line", () => {
    expect(vim("|foo();", ts).keys("gcc").lines()).toEqual(["// foo();"]);
  });

  it("gcc again uncomments it", () => {
    const ide = vim("|foo();", ts).keys("gcc");
    expect(ide.lines()).toEqual(["// foo();"]);

    expect(ide.keys("gcc").lines()).toEqual(["foo();"]);
  });

  it("keeps the indentation in front", () => {
    expect(vim("    |foo();", ts).keys("gcc").lines()).toEqual(["    // foo();"]);
  });

  it("gc takes a motion", () => {
    expect(vim("|a\nb\nc", ts).keys("gcj").lines()).toEqual(["// a", "// b", "c"]);
  });

  it("works on a visual selection", () => {
    expect(vim("|a\nb", ts).keys("Vjgc").lines()).toEqual(["// a", "// b"]);
  });

  it("comments every line when only some are commented", () => {
    expect(vim("|// a\nb", ts).keys("gcj").lines()).toEqual(["// // a", "// b"]);
  });

  it("leaves blank lines alone", () => {
    expect(vim("|a\n\nb", ts).keys("gcG").lines()).toEqual(["// a", "", "// b"]);
  });

  it("uses the language's comment string", () => {
    expect(vim("|x = 1", { path: "a.py" }).keys("gcc").lines()).toEqual(["# x = 1"]);
  });
});
