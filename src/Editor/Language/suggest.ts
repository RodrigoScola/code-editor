// VS Code's suggest widget logic

// the first typed character must match at a word start; prefix and
// consecutive matches score higher; null when it doesn't match, 0 for an
// empty query
export function fuzzyScore(typed: string, label: string): number | null {
  throw new Error("not implemented");
}

export interface SuggestOptions {
  snippetSuggestions?: "top" | "bottom" | "inline" | "none";
  selection?: "first" | "recentlyUsed" | "recentlyUsedByPrefix" | (string & {});
  // what was picked before: { [prefix]: label, last: label }
  memory?: Record<string, string>;
}

export function rankSuggestions<I extends { label: string; kind?: string }>(
  items: I[],
  typed: string,
  options: SuggestOptions,
): { items: I[]; selected: number } {
  throw new Error("not implemented");
}
