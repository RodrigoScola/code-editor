import { describe, expect, it } from "vitest";
import { computeDiff, unchangedRegions } from "../../../src/Diff/diff.js";

// Edge cases for the diff editor (base spec: diff-editor.test.ts).

describe("computeDiff", () => {
  it("everything added to an empty file", () => {
    expect(computeDiff([], ["a", "b"], {}).changes).toEqual([
      expect.objectContaining({ original: [0, 0], modified: [0, 2] }),
    ]);
  });

  it("everything removed", () => {
    expect(computeDiff(["a", "b"], [], {}).changes).toEqual([
      expect.objectContaining({ original: [0, 2], modified: [0, 0] }),
    ]);
  });

  it("several changed characters in one line give several inner changes", () => {
    const { changes } = computeDiff(["a b c d"], ["a X c Y"], {});

    expect(changes[0].inner).toHaveLength(2);
  });

  it("a change only in white space inside the line is still a change with ignoreTrimWhitespace", () => {
    expect(computeDiff(["a b"], ["a  b"], { ignoreTrimWhitespace: true }).changes).toHaveLength(1);
  });

  it("a moved block that was also edited is not a move", () => {
    const original = ["x", "one", "two", "three", "y"];
    const modified = ["y", "x", "one", "TWO", "three"];

    expect(computeDiff(original, modified, { computeMoves: true }).moves).toEqual([]);
  });

  it("repeated lines are matched in order", () => {
    const { changes } = computeDiff(["a", "a", "a"], ["a", "a"], {});

    expect(changes).toHaveLength(1);
    expect(changes[0].modified[1] - changes[0].modified[0]).eq(0);
  });
});

describe("unchangedRegions", () => {
  it("with no changes the whole file is one unchanged region", () => {
    expect(unchangedRegions([], 20, { contextLineCount: 3, minimumLineCount: 3 })).toEqual([[0, 20]]);
  });

  it("changes close together share their context, and a short stretch stays visible", () => {
    const changes = [
      { original: [5, 6], modified: [5, 6], inner: [] },
      { original: [9, 10], modified: [9, 10], inner: [] },
    ];

    // lines 0-1 are only 2 lines, under the minimum of 3, so they stay
    expect(unchangedRegions(changes, 30, { contextLineCount: 3, minimumLineCount: 3 })).toEqual([[13, 30]]);
  });
});
