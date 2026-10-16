// editor.renderWhitespace

export type RenderWhitespace = "none" | "boundary" | "selection" | "trailing" | "all";

// the line as drawn: spaces shown as "·", a tab as "→" padded to its tab
// stop (tabs are expanded in every mode)
export function renderWhitespace(
  line: string,
  mode: RenderWhitespace,
  options: { tabSize: number; selections?: [number, number][] },
): string {
  throw new Error("not implemented");
}
