// The marks next to changed lines (VS Code's gutter, vim-gitgutter),
// comparing the buffer with the committed version

// 0-based, a minimal diff
export interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

export type GutterKind = "added" | "modified" | "deleted";

export interface GutterMark {
  line: number;
  kind: GutterKind;
}

export function diffLines(oldLines: string[], newLines: string[]): Hunk[] {
  throw new Error("not implemented");
}

// sorted by line; a deletion is marked on the line that now follows it (or
// the last line when it was at the end)
export function gutterMarks(oldText: string, newText: string): GutterMark[] {
  throw new Error("not implemented");
}
