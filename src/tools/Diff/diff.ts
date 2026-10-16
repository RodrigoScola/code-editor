// The diff editor's model. Line ranges are [start, end), 0-based.

export type LineRange = number[];

// a character range inside one line
export interface CharRange {
  line: number;
  start: number;
  end: number;
}

export interface InnerChange {
  originalRange: CharRange;
  modifiedRange: CharRange;
}

export interface DiffChange {
  original: LineRange;
  modified: LineRange;
  // what changed inside the lines
  inner: InnerChange[];
}

// a block of at least 3 lines that moved unchanged
export interface DiffMove {
  original: LineRange;
  modified: LineRange;
}

export interface DiffOptions {
  ignoreTrimWhitespace?: boolean;
  computeMoves?: boolean;
}

export interface DiffResult {
  changes: DiffChange[];
  moves: DiffMove[];
}

export function computeDiff(
  originalLines: string[],
  modifiedLines: string[],
  options: DiffOptions,
): DiffResult {
  throw new Error("not implemented");
}

// the ranges the diff editor collapses (diffEditor.hideUnchangedRegions)
export function unchangedRegions(
  changes: { original: LineRange; modified: LineRange }[],
  lineCount: number,
  options: { contextLineCount?: number; minimumLineCount?: number } = {},
): LineRange[] {
  throw new Error("not implemented");
}

// the change F7 / Shift+F7 goes to, wrapping around
export function nextChange<C extends { modified: LineRange }>(
  changes: C[],
  line: number,
  direction: "next" | "previous",
): C | undefined {
  throw new Error("not implemented");
}

// the modified lines with that change undone
export function revertChange(
  originalLines: string[],
  modifiedLines: string[],
  change: DiffChange,
): string[] {
  throw new Error("not implemented");
}
