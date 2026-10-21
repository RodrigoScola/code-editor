// Folding ranges. Lines are 0-based.

export interface FoldingRange {
  start: number;
  end: number;
  kind?: "comment" | "imports" | "region";
}

export interface FoldingOptions {
  tabSize: number;
  // //#region ... //#endregion; marker ranges include both marker lines
  markers?: { start: RegExp; end: RegExp };
  // indentation languages (Python, YAML): trailing empty lines are left
  // out of a block
  offSide?: boolean;
  // only the outermost ranges are kept past this count
  // (editor.foldingMaximumRegions)
  maxRanges?: number;
}

// sorted by start; an indentation range ends at the last more-indented
// line (a closing } stays outside)
export function computeFoldingRanges(lines: string[], options: FoldingOptions): FoldingRange[] {
  throw new Error("not implemented");
}

// ranges from a provider made safe to use: at least two lines, inside the
// document, no crossing; over the limit the deepest go first
export function mergeFoldingRanges(
  ranges: FoldingRange[],
  options: { lineCount: number; limit?: number },
): FoldingRange[] {
  throw new Error("not implemented");
}
