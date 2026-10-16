// editor.unicodeHighlight.*: characters that are easy to miss or to mistake

export interface UnicodeHighlight {
  line: number;
  column: number;
  char: string;
  reason: "invisible" | "ambiguous" | "nonBasicAscii";
  // the ASCII character an ambiguous one looks like
  confusableWith?: string;
}

export interface UnicodeHighlightOptions {
  invisibleCharacters?: boolean;
  ambiguousCharacters?: boolean;
  nonBasicASCII?: boolean;
  allowedCharacters?: Record<string, boolean>;
  allowedLocales?: Record<string, boolean>;
}

export function findUnicodeHighlights(lines: string[], options: UnicodeHighlightOptions = {}): UnicodeHighlight[] {
  throw new Error("not implemented");
}
