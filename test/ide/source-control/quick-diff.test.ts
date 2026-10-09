import { describe, expect, it } from "vitest";
import { hunkAt, quickDiff } from "../../../src/Scm/quickDiff.js";
import { code } from "../harness.js";

// Quick diff: the gutter bars that compare the editor with git
// (scm.diffDecorations). The basic marks are specced in
// test/ide/tools/git-gutter.test.ts. Proposed src/Scm/quickDiff.ts:
//   quickDiff(original, modified, { ignoreTrimWhitespace? }) -> hunks
//     [{ kind: "added" | "modified" | "deleted", originalStart,
//        originalEnd, modifiedStart, modifiedEnd }] (0-based, end exclusive)
//   hunkAt(hunks, line) -> the hunk on that line (for the inline peek)
// Editor commands:
//   editor.action.dirtydiff.next              show the next change inline
//   git.revertSelectedRanges                  put the hunk at the cursor
//                                             back to the original

describe("quickDiff", () => {
  it("added lines", () => {
    expect(quickDiff("a\nb", "a\nx\nb", {})).toEqual([
      { kind: "added", originalStart: 1, originalEnd: 1, modifiedStart: 1, modifiedEnd: 2 },
    ]);
  });

  it("modified lines", () => {
    expect(quickDiff("a\nb\nc", "a\nB\nc", {})).toEqual([
      { kind: "modified", originalStart: 1, originalEnd: 2, modifiedStart: 1, modifiedEnd: 2 },
    ]);
  });

  it("deleted lines", () => {
    expect(quickDiff("a\nb\nc", "a\nc", {})).toEqual([
      { kind: "deleted", originalStart: 1, originalEnd: 2, modifiedStart: 1, modifiedEnd: 1 },
    ]);
  });

  it("ignores changes in leading and trailing white space when asked", () => {
    expect(quickDiff("a\n  b", "a\nb  ", { ignoreTrimWhitespace: true })).toEqual([]);
    expect(quickDiff("a\n  b", "a\nb  ", { ignoreTrimWhitespace: false })).toHaveLength(1);
  });

  it("still sees changes inside the line with ignoreTrimWhitespace", () => {
    expect(quickDiff("a b", "a  b", { ignoreTrimWhitespace: true })).toHaveLength(1);
  });
});

describe("hunkAt", () => {
  const hunks = quickDiff("a\nb\nc\nd", "a\nB\nc\nd\ne", {});

  it("finds the hunk on a line", () => {
    expect(hunkAt(hunks, 1)?.kind).eq("modified");
    expect(hunkAt(hunks, 4)?.kind).eq("added");
  });

  it("finds nothing on an unchanged line", () => {
    expect(hunkAt(hunks, 2)).toBeUndefined();
  });
});

describe("reverting a hunk in the editor", () => {
  it("puts the change at the cursor back", () => {
    const vs = code("a\nB|\nc\nd\ne");
    vs.window().setDiffBase("a\nb\nc\nd");

    vs.run("git.revertSelectedRanges");

    expect(vs.lines()).toEqual(["a", "b", "c", "d", "e"]);
  });
});
