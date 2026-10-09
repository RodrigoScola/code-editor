import { describe, expect, it } from "vitest";
import {
  computeDiff,
  nextChange,
  revertChange,
  unchangedRegions,
} from "../../../src/Diff/diff.js";
import { code } from "../harness.js";

// The diff editor's model. Proposed src/Diff/diff.ts:
//   computeDiff(originalLines, modifiedLines, { ignoreTrimWhitespace?,
//     computeMoves? }) -> { changes, moves }
//     change: { original: [start, end), modified: [start, end),
//               inner: [{ originalRange, modifiedRange }] } in lines; inner
//               ranges are { line, start, end } character ranges of what
//               changed inside the lines
//     move: { original: [start, end), modified: [start, end) } for a block
//           of at least 3 lines that moved unchanged
//   unchangedRegions(changes, lineCount, { contextLineCount = 3,
//     minimumLineCount = 3 }) -> [start, end) ranges the diff editor
//     collapses (diffEditor.hideUnchangedRegions)
//   nextChange(changes, line, direction) -> the change to go to (F7 /
//     Shift+F7), wrapping around
//   revertChange(originalLines, modifiedLines, change) -> modified lines
//     with that change undone
// Commands: workbench.files.action.compareWithSaved (Ctrl+K D) opens
// ctx.diffEditor() with the saved file on the left and the editor's text
// on the right; workbench.files.action.compareWithClipboard (Ctrl+K C).

const lines = (text: string) => text.split("\n");

describe("computeDiff", () => {
  it("finds nothing for equal text", () => {
    expect(computeDiff(["a", "b"], ["a", "b"], {}).changes).toEqual([]);
  });

  it("finds a changed line and what changed inside it", () => {
    const { changes } = computeDiff(["hello world"], ["hello there"], {});

    expect(changes).toHaveLength(1);
    expect(changes[0].original).toEqual([0, 1]);
    expect(changes[0].inner).toEqual([
      {
        originalRange: { line: 0, start: 6, end: 11 },
        modifiedRange: { line: 0, start: 6, end: 11 },
      },
    ]);
  });

  it("an insertion has an empty original range", () => {
    expect(computeDiff(lines("a\nc"), lines("a\nb\nc"), {}).changes[0]).toMatchObject({
      original: [1, 1],
      modified: [1, 2],
    });
  });

  it("a deletion has an empty modified range", () => {
    expect(computeDiff(lines("a\nb\nc"), lines("a\nc"), {}).changes[0]).toMatchObject({
      original: [1, 2],
      modified: [1, 1],
    });
  });

  it("ignoreTrimWhitespace ignores indentation and trailing space", () => {
    expect(computeDiff(["  a", "b"], ["a", "b  "], { ignoreTrimWhitespace: true }).changes).toEqual([]);
  });

  it("finds a moved block", () => {
    const original = lines("x\none\ntwo\nthree\ny\nz");
    const modified = lines("x\ny\nz\none\ntwo\nthree");

    const { moves } = computeDiff(original, modified, { computeMoves: true });

    expect(moves).toEqual([{ original: [1, 4], modified: [3, 6] }]);
  });
});

describe("unchangedRegions", () => {
  it("collapses long unchanged stretches, keeping context around changes", () => {
    const changes = [{ original: [10, 11], modified: [10, 11], inner: [] }];

    expect(unchangedRegions(changes, 30, { contextLineCount: 3, minimumLineCount: 3 })).toEqual([
      [0, 7],
      [14, 30],
    ]);
  });

  it("does not collapse stretches shorter than the minimum", () => {
    const changes = [{ original: [4, 5], modified: [4, 5], inner: [] }];

    expect(unchangedRegions(changes, 8, { contextLineCount: 3, minimumLineCount: 3 })).toEqual([]);
  });
});

describe("nextChange", () => {
  const changes = [
    { original: [2, 3], modified: [2, 3], inner: [] },
    { original: [8, 9], modified: [8, 9], inner: [] },
  ];

  it("goes to the next change below", () => {
    expect(nextChange(changes, 4, "next")).toBe(changes[1]);
  });

  it("wraps to the first after the last", () => {
    expect(nextChange(changes, 9, "next")).toBe(changes[0]);
  });

  it("goes back with previous", () => {
    expect(nextChange(changes, 4, "previous")).toBe(changes[0]);
  });
});

describe("revertChange", () => {
  it("undoes one change and leaves the others", () => {
    const original = lines("a\nb\nc\nd");
    const modified = lines("a\nB\nc\nD");
    const { changes } = computeDiff(original, modified, {});

    expect(revertChange(original, modified, changes[0])).toEqual(lines("a\nb\nc\nD"));
  });
});

describe("compare commands", () => {
  it("compareWithSaved shows the saved text against the editor's text", () => {
    const ide = code("|saved", { path: "a.txt" }).type("new ");

    ide.executeCommand("diff.compareWithSaved");

    expect(ide.diffEditor()).toMatchObject({
      original: "saved",
      modified: "new saved",
    });
  });

  it("compareWithClipboard shows the clipboard against the editor's text", () => {
    const ide = code("|mine", { path: "a.txt" });
    ide.clipboard.writeText("copied");

    ide.executeCommand("diff.compareWithClipboard");

    expect(ide.diffEditor()).toMatchObject({ original: "copied", modified: "mine" });
  });
});
