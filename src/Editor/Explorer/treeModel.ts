// The Explorer tree computed from a flat list of entries, with no file
// system access
import type { GlobExpression } from "../../tools/Search/glob.js";

export interface TreeEntry {
  // relative, "/" separated
  path: string;
  type: "file" | "folder";
  mtime?: number;
}

export interface TreeDecoration {
  // git status: "M" | "A" | "D" | "U" | "!"
  letter?: string;
  // a folder above a changed file
  containsChanges?: boolean;
  errors?: number;
  warnings?: number;
  containsErrors?: boolean;
}

export interface TreeNode {
  // "a/b/c" for a compacted folder chain
  name: string;
  path: string;
  type: "file" | "folder";
  children: TreeNode[];
  // files nested under this one (file nesting)
  nested: TreeNode[];
  decoration: TreeDecoration;
  // filterTree: the matched character positions
  match?: number[];
}

export interface TreeOptions {
  // default: folders first; type: by extension; modified: newest first
  sortOrder?: "default" | "mixed" | "filesFirst" | "type" | "modified";
  lexicographic?: "default" | "upper" | "lower" | "unicode";
  compactFolders?: boolean;
  // patterns: { "package.json": "package-lock.json, yarn.lock",
  // "*.ts": "${capture}.js" }
  fileNesting?: { enabled: boolean; patterns: Record<string, string> };
  exclude?: GlobExpression;
  gitStatus?: Record<string, string>;
  problems?: Record<string, { errors: number; warnings: number }>;
}

// names compare numerically: a2 before a10
export function buildTree(entries: TreeEntry[], options: TreeOptions): TreeNode[] {
  throw new Error("not implemented");
}

// nodes matching the text fuzzily, plus their ancestors; highlight keeps
// everything and marks the matches
export function filterTree(nodes: TreeNode[], text: string, mode: "filter" | "highlight"): TreeNode[] {
  throw new Error("not implemented");
}
