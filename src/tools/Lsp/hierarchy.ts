// Call hierarchy and type hierarchy: a tree that starts at the symbol under
// the cursor and grows one level each time a row is expanded
import type { Location, Position, Range } from "./types.js";

export interface HierarchyItem {
  name: string;
  kind: string;
  detail?: string;
  path: string;
  range: Range;
  selectionRange: Range;
}

export interface CallHierarchyProvider {
  prepare(path: string, position: Position): HierarchyItem[];
  incomingCalls(item: HierarchyItem): { from: HierarchyItem; fromRanges: Range[] }[];
  outgoingCalls(item: HierarchyItem): { to: HierarchyItem; fromRanges: Range[] }[];
}

export interface TypeHierarchyProvider {
  prepare(path: string, position: Position): HierarchyItem[];
  supertypes(item: HierarchyItem): HierarchyItem[];
  subtypes(item: HierarchyItem): HierarchyItem[];
}

export interface HierarchyRow {
  depth: number;
  name: string;
  detail?: string;
  expanded: boolean;
}

export interface HierarchyView<Direction extends string> {
  direction: Direction;
  // switches direction; the tree starts over
  toggle(): void;
  // the visible rows
  rows(): HierarchyRow[];
  // children are asked for once, when a row is first expanded
  expand(row: number): void;
  collapse(row: number): void;
  // for incoming calls the first call site, otherwise the selectionRange
  target(row: number): Location;
}

// starts with incoming calls; undefined when there is nothing at position
export function callHierarchy(
  provider: CallHierarchyProvider,
  path: string,
  position: Position,
): HierarchyView<"incoming" | "outgoing"> | undefined {
  throw new Error("not implemented");
}

// starts with subtypes
export function typeHierarchy(
  provider: TypeHierarchyProvider,
  path: string,
  position: Position,
): HierarchyView<"supertypes" | "subtypes"> | undefined {
  throw new Error("not implemented");
}
