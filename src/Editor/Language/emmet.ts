// VS Code's built-in Emmet. Offsets are into the text.

// tab stops left out; nested elements indented with "\t", inline elements
// on one line
export function expandAbbreviation(abbreviation: string, options: { syntax: "html" | "css" }): string {
  throw new Error("not implemented");
}

// a bare * repeats the element for each line
export function wrapWithAbbreviation(text: string, abbreviation: string): string {
  throw new Error("not implemented");
}

// the next bigger [start, end) around the selection
export function balanceOut(text: string, selection: [number, number]): [number, number] {
  throw new Error("not implemented");
}

// the tag at offset removed, its contents kept
export function removeTag(text: string, offset: number): string {
  throw new Error("not implemented");
}

// renames both the opening and the closing tag
export function updateTag(text: string, offset: number, newName: string): string {
  throw new Error("not implemented");
}

// <div></div> <-> <div />
export function splitJoinTag(text: string, offset: number): string {
  throw new Error("not implemented");
}

// the number at offset changed by delta
export function incrementNumber(text: string, offset: number, delta: number): string {
  throw new Error("not implemented");
}

// the expression before offset replaced by its value
export function evaluateMath(text: string, offset: number): string {
  throw new Error("not implemented");
}
