import { describe, expect, it } from "vitest";
import { activeIndentGuide, indentGuides } from "../../../src/Editor/decorations/indentGuides.js";

// Proposed module src/Editor/decorations/indentGuides.ts
// (editor.guides.indentation, editor.guides.highlightActiveIndentation).
//
//   indentGuides(lines, tabSize) -> number of guides to draw on each line
//     (one per indentation level). An empty line between two lines takes
//     the guides of the block it is in.
//   activeIndentGuide(lines, cursorLine, tabSize)
//     -> { level, startLine, endLine } of the block around the cursor, or
//        null at the top level. level is 1-based; the lines are the block's
//        indented lines.

describe("indentGuides", () => {
  it("draws one guide per level", () => {
    expect(indentGuides(["a", "    b", "        c", "d"], 4)).toEqual([0, 1, 2, 0]);
  });

  it("counts a tab as one level", () => {
    expect(indentGuides(["a", "\tb", "\t\tc"], 4)).toEqual([0, 1, 2]);
  });

  it("follows the tab size", () => {
    expect(indentGuides(["a", "  b", "    c"], 2)).toEqual([0, 1, 2]);
  });

  it("gives an empty line inside a block the block's guides", () => {
    expect(indentGuides(["a", "    b", "", "    c", "d"], 4)).toEqual([0, 1, 1, 1, 0]);
  });

  it("only counts full levels", () => {
    expect(indentGuides(["a", "      b"], 4)).toEqual([0, 1]);
  });
});

describe("activeIndentGuide", () => {
  const lines = ["a {", "    b {", "        c", "    }", "    d", "}"];

  it("is the innermost block around the cursor", () => {
    expect(activeIndentGuide(lines, 2, 4)).toEqual({ level: 2, startLine: 2, endLine: 2 });
  });

  it("covers the whole block at the outer level", () => {
    expect(activeIndentGuide(lines, 4, 4)).toEqual({ level: 1, startLine: 1, endLine: 4 });
  });

  it("is the block that starts on the cursor line when the cursor is on its header", () => {
    expect(activeIndentGuide(lines, 1, 4)).toEqual({ level: 2, startLine: 2, endLine: 2 });
  });

  it("is null at the top level", () => {
    expect(activeIndentGuide(["a", "b"], 0, 4)).toBeNull();
  });
});
