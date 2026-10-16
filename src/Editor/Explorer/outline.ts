// The Outline view and the breadcrumbs bar, from document symbols (a
// provider or Markdown headings)
import type { Position, Range } from "../../tools/Lsp/types.js";

// a document symbol as a provider gives it; children are symbols too
export interface SymbolLike {
  name: string;
  // VS Code's SymbolKind names: "class", "method", "function", ...
  kind: string;
  range: Range;
  detail?: string;
  children?: readonly unknown[];
}

export interface OutlineNode {
  name: string;
  kind: string;
  range: Range;
  detail?: string;
  children: OutlineNode[];
}

// sorted; with filter, matching symbols and their parents
export function outline(
  symbols: readonly SymbolLike[],
  options: { sortBy: "position" | "name" | "kind"; filter?: string },
): OutlineNode[] {
  throw new Error("not implemented");
}

// the innermost symbol containing position (the outline follows the cursor)
export function symbolAt(symbols: readonly SymbolLike[], position: Position): SymbolLike | undefined {
  throw new Error("not implemented");
}

// the file's folders, the file, then the symbol path
export function breadcrumbs(
  path: string,
  symbols: readonly SymbolLike[],
  position: Position,
  options: { separator?: string } = {},
): string[] {
  throw new Error("not implemented");
}
