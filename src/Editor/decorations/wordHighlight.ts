// editor.occurrencesHighlight without a language server: whole words,
// matching case
import type { TextPosition } from "../text/textMarkers.js";

// every occurrence of the word at (or right before) position
export function wordOccurrences(
  lines: string[],
  position: TextPosition,
): { line: number; start: number; end: number }[] {
  throw new Error("not implemented");
}
