import { describe, expect, it } from "vitest";
import { diffLines, gutterMarks } from "../../../src/Tools/diff.js";
import { vim } from "../harness.js";

// Proposed module src/Tools/diff.ts: the marks next to changed lines
// (VS Code's gutter, vim-gitgutter), comparing the buffer with the
// committed version.
//
//   diffLines(oldLines, newLines) -> hunks, each
//     { oldStart, oldCount, newStart, newCount }  (0-based, a minimal diff)
//   gutterMarks(oldText, newText) -> [{ line, kind }] sorted by line
//     kind: "added" | "modified" | "deleted"
//     a deletion is marked on the line that now follows it (or the last
//     line when it was at the end)
//
// In the editor: codeWindow.setDiffBase(text) sets what to compare with;
// ]c / [c jump to the next / previous change.

const lines = (text: string) => text.split("\n");

describe("gutterMarks", () => {
  it("has nothing for identical text", () => {
    expect(gutterMarks("a\nb", "a\nb")).toEqual([]);
  });

  it("marks added lines", () => {
    expect(gutterMarks("a\nb", "a\nx\ny\nb")).toEqual([
      { line: 1, kind: "added" },
      { line: 2, kind: "added" },
    ]);
  });

  it("marks changed lines", () => {
    expect(gutterMarks("a\nb\nc", "a\nB\nc")).toEqual([{ line: 1, kind: "modified" }]);
  });

  it("marks a deletion on the line after it", () => {
    expect(gutterMarks("a\nb\nc", "a\nc")).toEqual([{ line: 1, kind: "deleted" }]);
  });

  it("marks a deletion at the end on the last line", () => {
    expect(gutterMarks("a\nb", "a")).toEqual([{ line: 0, kind: "deleted" }]);
  });

  it("handles several changes at once", () => {
    expect(gutterMarks("a\nb\nc\nd", "A\nb\nd\ne")).toEqual([
      { line: 0, kind: "modified" },
      { line: 2, kind: "deleted" },
      { line: 3, kind: "added" },
    ]);
  });
});

describe("diffLines", () => {
  it("finds the smallest set of changes", () => {
    expect(diffLines(lines("a\nb\nc\nd"), lines("a\nc\nd\ne"))).toEqual([
      { oldStart: 1, oldCount: 1, newStart: 1, newCount: 0 },
      { oldStart: 4, oldCount: 0, newStart: 3, newCount: 1 },
    ]);
  });

  it("is fast on big files with few changes", () => {
    const old = Array.from({ length: 20000 }, (_, i) => `line ${i}`);
    const changed = [...old];
    changed[10000] = "changed";

    const start = performance.now();
    const hunks = diffLines(old, changed);

    expect(performance.now() - start).toBeLessThan(500);
    expect(hunks).toEqual([{ oldStart: 10000, oldCount: 1, newStart: 10000, newCount: 1 }]);
  });
});

describe("in the editor", () => {
  it("]c and [c jump between changes", () => {
    const ide = vim("|a\nX\nc\nd");
    ide.window().setDiffBase("a\nb\nc");

    expect(ide.keys("]c").cursor().line).eq(1);
    expect(ide.keys("]c").cursor().line).eq(3);
    expect(ide.keys("[c").cursor().line).eq(1);
  });
});
