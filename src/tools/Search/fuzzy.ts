// Fuzzy matching for the file finder, the command palette and completion

export interface FuzzyMatch {
  score: number;
  // the matched indexes, for highlighting
  positions: number[];
}

// the query's characters in order, ignoring case; null when they aren't
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  throw new Error("not implemented");
}

// the matching items, best first; an empty query keeps everything in order
export function fuzzyFilter<T>(query: string, items: T[], toText?: (item: T) => string): T[] {
  throw new Error("not implemented");
}
