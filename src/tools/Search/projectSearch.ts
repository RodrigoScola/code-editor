// The Search view (Ctrl+Shift+F), Vim's :grep
import type { GlobExpression } from "./glob.js";

export interface SearchResult {
  // relative to the root, "/" separated
  path: string;
  // 0-based
  line: number;
  column: number;
  // the whole line
  text: string;
  // of the match
  length: number;
}

// sorted by path then line; limitHit when maxResults stopped the search
export type SearchResults = SearchResult[] & { limitHit?: boolean };

export interface SearchOptions {
  regex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  // a query with no upper case letters ignores case
  smartCase?: boolean;
  // comma-separated globs; a bare name is a folder or file at any depth
  include?: string | string[];
  exclude?: string | string[];
  // files.exclude, search.exclude, .gitignore and .ignore (default true)
  useExcludeSettingsAndIgnoreFiles?: boolean;
  filesExclude?: GlobExpression;
  searchExclude?: GlobExpression;
  maxResults?: number;
}

export function searchFiles(root: string, query: string, options: SearchOptions = {}): SearchResults {
  throw new Error("not implemented");
}

// how many were replaced
export function replaceInFiles(
  root: string,
  results: SearchResult[],
  replacement: string,
  options: { preserveCase?: boolean } = {},
): number {
  throw new Error("not implemented");
}

// the line before and after, for the diff view
export function previewReplace(
  result: SearchResult,
  replacement: string,
  options: { preserveCase?: boolean } = {},
): { before: string; after: string } {
  throw new Error("not implemented");
}

// the text of a .code-search Search Editor file
export function serializeSearchEditor(
  query: string,
  results: SearchResult[],
  options: { contextLines: number; flags: string[] },
): string {
  throw new Error("not implemented");
}
