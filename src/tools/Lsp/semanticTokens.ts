export interface SemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

export interface SemanticToken {
  line: number;
  start: number;
  length: number;
  type: string;
  modifiers: string[];
}

// data is [deltaLine, deltaStart, length, type, modifiers bitset] per token
export function decodeSemanticTokens(data: number[], legend: SemanticTokensLegend): SemanticToken[] {
  throw new Error("not implemented");
}
