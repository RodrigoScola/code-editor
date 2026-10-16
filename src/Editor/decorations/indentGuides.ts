// editor.guides.indentation, editor.guides.highlightActiveIndentation

// the number of guides on each line, one per full level; an empty line
// takes the guides of the block it is in
export function indentGuides(lines: string[], tabSize: number): number[] {
  throw new Error("not implemented");
}

export interface ActiveIndentGuide {
  // 1-based
  level: number;
  // the block's indented lines
  startLine: number;
  endLine: number;
}

// the block around the cursor, or null at the top level
export function activeIndentGuide(
  lines: string[],
  cursorLine: number,
  tabSize: number,
): ActiveIndentGuide | null {
  throw new Error("not implemented");
}
