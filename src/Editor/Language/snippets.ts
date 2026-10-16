// The snippet syntax VS Code and language servers use

export interface SnippetTabstop {
  index: number;
  // offsets into the text; more than one for a mirror
  ranges: { start: number; end: number }[];
}

export interface ParsedSnippet {
  // the placeholders filled in
  text: string;
  // in visiting order: $1, $2, ... and $0 last
  tabstops: SnippetTabstop[];
}

export function parseSnippet(body: string): ParsedSnippet {
  throw new Error("not implemented");
}

export interface SnippetContext {
  file?: string;
  workspaceFolder?: string;
  workspaceName?: string;
  selectedText?: string;
  currentLine?: string;
  currentWord?: string;
  lineIndex?: number;
  clipboard?: string;
  // for the comment variables
  language?: string;
  now?: Date;
  cursorIndex?: number;
  random?: () => number;
}

// the text, with tab stops resolved to their default text (variables and
// transforms applied)
export function resolveSnippet(body: string, context: SnippetContext): string {
  throw new Error("not implemented");
}

export interface SnippetDefinition {
  name: string;
  prefixes: string[];
  // lines joined with "\n"
  body: string;
  description?: string;
  scopes?: string[];
  isFileTemplate: boolean;
  include?: string[];
  exclude?: string[];
}

// a broken entry is skipped
export function parseSnippetFile(jsonText: string, options: { language?: string } = {}): SnippetDefinition[] {
  throw new Error("not implemented");
}

// include / exclude globs
export function snippetAppliesTo(
  snippet: Pick<SnippetDefinition, "include" | "exclude">,
  path: string,
): boolean {
  throw new Error("not implemented");
}
