// Syntax highlighting, line by line with the state carried over, so a
// change only re-tokenizes until the state matches what it was before

export type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "identifier"
  | "operator"
  | "punctuation"
  | (string & {});

export interface Token {
  // columns, end exclusive
  start: number;
  end: number;
  type: TokenType;
}

// what carries over to the next line (an open block comment, an open
// template string)
export interface TokenizerState {
  readonly mode: "code" | "blockComment" | "templateString";
}

// tokens sorted and not overlapping; plain text may be left out
export function tokenizeLine(
  language: string,
  line: string,
  state?: TokenizerState,
): { tokens: Token[]; state: TokenizerState } {
  throw new Error("not implemented");
}
