// Staging parts of a file (Git: Stage Selected Ranges). Works on text.

// 0-based, inclusive, in the "new" side's lines; a deletion is selected by
// selecting the line where it happened
export interface LineSpan {
  start: number;
  end: number;
}

// the new index text with only the changes touching the lines staged
export function stageRanges(indexText: string, workingText: string, lines: LineSpan[]): string {
  throw new Error("not implemented");
}

// the new index text with the selected index lines put back to HEAD
export function unstageRanges(headText: string, indexText: string, lines: LineSpan[]): string {
  throw new Error("not implemented");
}

// the new working text with the selected changes thrown away
export function revertRanges(indexText: string, workingText: string, lines: LineSpan[]): string {
  throw new Error("not implemented");
}
