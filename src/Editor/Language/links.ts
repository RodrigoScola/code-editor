// Links in the text (editor.links)

export interface DocumentLink {
  line: number;
  start: number;
  end: number;
  target: string;
}

// http(s)://, file:// and mailto:; sentence punctuation at the end is not
// part of the link, balanced brackets inside it are
export function findLinks(text: string): DocumentLink[] {
  throw new Error("not implemented");
}
