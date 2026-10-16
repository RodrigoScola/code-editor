// VS Code's built-in Markdown language features

// GitHub style; pass one seen Set for the whole document so repeats get
// -1, -2
export function slugify(heading: string, seen?: Set<string>): string {
  throw new Error("not implemented");
}

export interface MarkdownHeading {
  name: string;
  level: number;
  line: number;
  children: MarkdownHeading[];
}

export function documentSymbols(text: string): MarkdownHeading[] {
  throw new Error("not implemented");
}

// heading sections, fenced code blocks, <!-- #region --> markers
export function foldingRanges(text: string): { start: number; end: number }[] {
  throw new Error("not implemented");
}

export interface MarkdownLinkProblem {
  message: string;
  line: number;
  start: number;
  end: number;
}

// links to missing files, missing heading fragments and undefined
// reference links; external links aren't checked
export function validateLinks(
  text: string,
  options: {
    path: string;
    exists(path: string): boolean;
    // for headings in other files
    readFile?(path: string): string | undefined;
  },
): MarkdownLinkProblem[] {
  throw new Error("not implemented");
}

// markdown.updateLinksOnFileMove
export function updateLinksForMove(text: string, docPath: string, oldPath: string, newPath: string): string {
  throw new Error("not implemented");
}

// HTML with data-line on block elements and id slugs on headings
export function renderPreview(text: string): string {
  throw new Error("not implemented");
}
