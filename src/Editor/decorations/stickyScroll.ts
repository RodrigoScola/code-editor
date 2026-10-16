// editor.stickyScroll: the first lines of the blocks the top of the view
// is inside stay pinned, outermost first

// ranges: scopes ({ start, end } inclusive) from the outline, folding or
// indentation model; a scope is pinned when its first line has scrolled
// out of view and the top line is still inside it
export function stickyLines(
  ranges: { start: number; end: number }[],
  firstVisibleLine: number,
  maxLineCount = 5,
): number[] {
  throw new Error("not implemented");
}
