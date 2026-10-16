// Languages: which one a file is, and how it comments and brackets

// by user association (longest pattern wins), extension (any case), file
// name, then #! line; otherwise "plaintext"
export function detectLanguage(
  path: string,
  firstLine?: string,
  options: { associations?: Record<string, string> } = {},
): string {
  throw new Error("not implemented");
}

export interface LanguageConfig {
  lineComment?: string;
  blockComment?: [string, string];
  brackets: [string, string][];
  autoClosingPairs?: [string, string][];
  surroundingPairs?: [string, string][];
  wordPattern?: RegExp;
}

// an empty config for plaintext and unknown languages
export function languageConfig(id: string): LanguageConfig {
  throw new Error("not implemented");
}
