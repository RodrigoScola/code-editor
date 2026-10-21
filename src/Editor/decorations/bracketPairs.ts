// editor.bracketPairColorization.enabled, editor.guides.bracketPairs
import type { TextPosition } from "../text/textMarkers.js";

export interface BracketColor {
  line: number;
  column: number;
  // nesting level, 0 = outermost; the UI picks level % 6
  level: number;
  // a closing bracket with nothing (or the wrong type) to close
  unexpected?: true;
}

export interface BracketOptions {
  // each bracket type counts its own levels
  independentColorPoolPerBracketType?: boolean;
  // brackets inside strings and comments are skipped
  language?: string;
}

export function colorizeBrackets(lines: string[], options: BracketOptions = {}): BracketColor[] {
  throw new Error("not implemented");
}

// for the bracket right before or after position
export function matchingBracket(
  lines: string[],
  position: TextPosition,
): { open: TextPosition; close: TextPosition } | null {
  throw new Error("not implemented");
}
