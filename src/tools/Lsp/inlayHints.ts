export interface InlayHint {
  // the character the label goes before
  position: number;
  label: string;
  paddingLeft?: boolean;
  paddingRight?: boolean;
}

// the line with the hint labels drawn in
export function renderInlayHints(line: string, hints: InlayHint[]): string {
  throw new Error("not implemented");
}
