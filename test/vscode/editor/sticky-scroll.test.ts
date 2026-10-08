import { describe, expect, it } from "vitest";
import { stickyLines } from "../../../src/Editor/decorations/stickyScroll.js";

// Proposed module src/Editor/decorations/stickyScroll.ts
// (editor.stickyScroll.enabled, maxLineCount, defaultModel).
// While scrolling, the first lines of the blocks the top of the view is
// inside stay pinned at the top, outermost first.
//
//   stickyLines(ranges, firstVisibleLine, maxLineCount = 5) -> line numbers
//     ranges: the scopes ({ start, end }, inclusive) from the outline,
//     folding, or indentation model
//   A scope is pinned when its first line has scrolled out of view and the
//   view's top line is still inside it.

const ranges = [
  { start: 0, end: 20 }, // class
  { start: 2, end: 10 }, //   method
  { start: 4, end: 8 }, //      if
  { start: 12, end: 18 }, //  another method
];

describe("stickyLines", () => {
  it("pins nothing at the top of the file", () => {
    expect(stickyLines(ranges, 0)).toEqual([]);
  });

  it("pins the class once its first line is out of view", () => {
    expect(stickyLines(ranges, 1)).toEqual([0]);
  });

  it("pins every enclosing scope, outermost first", () => {
    expect(stickyLines(ranges, 5)).toEqual([0, 2, 4]);
  });

  it("drops scopes the view has scrolled past", () => {
    expect(stickyLines(ranges, 13)).toEqual([0, 12]);
  });

  it("pins nothing past the end of every scope", () => {
    expect(stickyLines(ranges, 25)).toEqual([]);
  });

  it("keeps at most maxLineCount lines", () => {
    expect(stickyLines(ranges, 5, 2)).toHaveLength(2);
  });
});
