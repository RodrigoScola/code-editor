// Quick diff: the gutter bars that compare the editor with git
// (scm.diffDecorations)
import type { GutterKind } from "./diff.js";

// 0-based, end exclusive
export interface QuickDiffHunk {
  kind: GutterKind;
  originalStart: number;
  originalEnd: number;
  modifiedStart: number;
  modifiedEnd: number;
}

export function quickDiff(
  original: string,
  modified: string,
  options: { ignoreTrimWhitespace?: boolean },
): QuickDiffHunk[] {
  throw new Error("not implemented");
}

// the hunk on that line (for the inline peek)
export function hunkAt(hunks: QuickDiffHunk[], line: number): QuickDiffHunk | undefined {
  throw new Error("not implemented");
}
