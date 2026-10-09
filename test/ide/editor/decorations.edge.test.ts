import { describe, expect, it } from "vitest";
import { colorizeBrackets } from "../../../src/Editor/decorations/bracketPairs.js";
import { indentGuides } from "../../../src/Editor/decorations/indentGuides.js";
import { renderWhitespace } from "../../../src/Editor/decorations/whitespace.js";
import { findUnicodeHighlights } from "../../../src/Editor/decorations/unicodeHighlight.js";
import { wordOccurrences } from "../../../src/Editor/decorations/wordHighlight.js";
import { stickyLines } from "../../../src/Editor/decorations/stickyScroll.js";

// Edge cases for the rendering aids (base specs: bracket-pairs,
// indent-guides, render-whitespace, unicode-highlight, word-highlight,
// sticky-scroll).

describe("bracket pairs", () => {
  it("levels keep counting past six (the UI wraps the colors)", () => {
    const levels = colorizeBrackets(["((((((((x))))))))"]).map((b: { level: number }) => b.level);

    expect(Math.max(...levels)).eq(7);
  });

  it("an unclosed opening bracket keeps its level", () => {
    expect(colorizeBrackets(["(("]).map((b: { level: number }) => b.level)).toEqual([0, 1]);
  });

  it("brackets in a template string's ${} are code", () => {
    const result = colorizeBrackets(["`${f(a)}`"], { language: "typescript" });

    expect(result.map((b: { column: number }) => b.column)).toEqual(expect.arrayContaining([4, 6]));
  });
});

describe("indent guides", () => {
  it("an empty line after a deeper block gets one guide more than the line below it", () => {
    // it is still inside the block that ends below (VS Code's rule for
    // brace languages)
    expect(indentGuides(["a", "        b", "", "    c"], 4)).toEqual([0, 2, 2, 1]);
  });

  it("an empty line before a deeper block gets one guide more than the line above it", () => {
    expect(indentGuides(["a", "", "    b"], 4)).toEqual([0, 1, 1]);
  });

  it("empty lines at the end of the file have none", () => {
    expect(indentGuides(["a", "    b", "", ""], 4)).toEqual([0, 1, 0, 0]);
  });
});

describe("render whitespace", () => {
  it("a tab in the middle of a line goes to the next tab stop", () => {
    expect(renderWhitespace("ab\tc", "all", { tabSize: 4 })).eq("ab→ c");
  });

  it("boundary shows two spaces between words", () => {
    expect(renderWhitespace("a  b", "boundary", { tabSize: 4 })).eq("a··b");
  });

  it("boundary shows a tab between words", () => {
    expect(renderWhitespace("a\tb", "boundary", { tabSize: 4 })).eq("a→  b");
  });

  it("trailing on a line of only white space shows all of it", () => {
    expect(renderWhitespace("  ", "trailing", { tabSize: 4 })).eq("··");
  });
});

describe("unicode highlight", () => {
  it("finds several on one line in order", () => {
    const found = findUnicodeHighlights(["​a​b"]);

    expect(found.map((f: { column: number }) => f.column)).toEqual([0, 2]);
  });

  it("finds them on later lines", () => {
    expect(findUnicodeHighlights(["ok", "x​y"])[0]).toMatchObject({ line: 1, column: 1 });
  });

  it("a non-breaking space looks like a space", () => {
    expect(findUnicodeHighlights(["a b"])[0]).toMatchObject({ column: 1 });
  });

  it("the Greek question mark looks like a semicolon", () => {
    expect(findUnicodeHighlights(["x;"])[0]).toMatchObject({ reason: "ambiguous", confusableWith: ";" });
  });
});

describe("word highlight", () => {
  it("does not match inside longer words with digits", () => {
    expect(wordOccurrences(["a a1 a"], { line: 0, column: 0 })).toEqual([
      { line: 0, start: 0, end: 1 },
      { line: 0, start: 5, end: 6 },
    ]);
  });

  it("$ is a word separator, so $el highlights el", () => {
    expect(wordOccurrences(["$el _x $el"], { line: 0, column: 1 })).toEqual([
      { line: 0, start: 1, end: 3 },
      { line: 0, start: 8, end: 10 },
    ]);
  });
});

describe("sticky scroll", () => {
  it("keeps the outermost scopes when cut to maxLineCount", () => {
    const nested = [
      { start: 0, end: 50 },
      { start: 1, end: 40 },
      { start: 2, end: 30 },
    ];

    expect(stickyLines(nested, 10, 2)).toEqual([0, 1]);
  });
});
