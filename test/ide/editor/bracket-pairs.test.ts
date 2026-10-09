import { describe, expect, it } from "vitest";
import { colorizeBrackets, matchingBracket } from "../../../src/Editor/decorations/bracketPairs.js";

// Proposed module src/Editor/decorations/bracketPairs.ts
// (editor.bracketPairColorization.enabled, editor.guides.bracketPairs).
//
//   colorizeBrackets(lines, options?) -> [{ line, column, level, unexpected? }]
//     every bracket with its nesting level (0 = outermost). The UI picks
//     color level % 6 (editorBracketHighlight.foreground1..6). A closing
//     bracket with nothing to close is { unexpected: true }.
//     options.independentColorPoolPerBracketType: each bracket type counts
//     its own levels.
//     options.language: brackets inside strings and comments are skipped
//     (uses the tokenizer from test/ide/editor/syntax-highlight.test.ts).
//   matchingBracket(lines, position) -> { open, close } | null for the
//     bracket right before or after the position.

const levels = (lines: string[], options = {}) =>
  colorizeBrackets(lines, options).map((b) => b.level);

describe("colorizeBrackets", () => {
  it("gives a simple pair level 0", () => {
    expect(colorizeBrackets(["(a)"])).toEqual([
      { line: 0, column: 0, level: 0 },
      { line: 0, column: 2, level: 0 },
    ]);
  });

  it("counts nesting across bracket types", () => {
    expect(levels(["([{}])"])).toEqual([0, 1, 2, 2, 1, 0]);
  });

  it("works across lines", () => {
    expect(levels(["f(", "  [x]", ")"])).toEqual([0, 1, 1, 0]);
  });

  it("marks a closing bracket with nothing to close", () => {
    expect(colorizeBrackets([")"])).toEqual([{ line: 0, column: 0, level: 0, unexpected: true }]);
  });

  it("marks a closing bracket of the wrong type", () => {
    const result = colorizeBrackets(["(]"]);

    expect(result[1]).toMatchObject({ column: 1, unexpected: true });
  });

  it("can count each bracket type separately", () => {
    expect(levels(["([])"], { independentColorPoolPerBracketType: true })).toEqual([0, 0, 0, 0]);
  });

  it("skips brackets in strings and comments", () => {
    const result = colorizeBrackets(['a = "(" + (b) // )'], { language: "typescript" });

    expect(result.map((b) => b.column)).toEqual([10, 12]);
  });
});

describe("matchingBracket", () => {
  it("finds the match of the bracket after the cursor", () => {
    expect(matchingBracket(["(ab)"], { line: 0, column: 0 })).toEqual({
      open: { line: 0, column: 0 },
      close: { line: 0, column: 3 },
    });
  });

  it("finds the match of the bracket before the cursor", () => {
    expect(matchingBracket(["(ab)"], { line: 0, column: 4 })).toEqual({
      open: { line: 0, column: 0 },
      close: { line: 0, column: 3 },
    });
  });

  it("finds a match on another line", () => {
    expect(matchingBracket(["{", "  x", "}"], { line: 0, column: 0 })?.close).toEqual({
      line: 2,
      column: 0,
    });
  });

  it("returns null away from brackets", () => {
    expect(matchingBracket(["(a b)"], { line: 0, column: 2 })).toBeNull();
  });
});
