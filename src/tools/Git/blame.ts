// Git blame (inline at the cursor line and in the status bar)

export interface BlameLine {
  line: number;
  hash: string;
  authorName: string;
  authorEmail: string;
  // ms
  authorTime: number;
  summary: string;
  uncommitted: boolean;
}

// one entry per line of `git blame --porcelain`
export function parseBlame(output: string): BlameLine[] {
  throw new Error("not implemented");
}

// ${subject} ${authorName} ${authorEmail} ${authorDateAgo} ${hash}
// ${hashShort} (git.blame.editorDecoration.template)
export function renderBlame(
  template: string,
  entry: Pick<BlameLine, "hash" | "authorName" | "authorEmail" | "authorTime" | "summary">,
  now: number,
): string {
  throw new Error("not implemented");
}

// "now", "5 mins ago", "3 hrs ago", "1 day ago", "2 mos ago", "2 yrs ago"
export function fromNow(time: number, now: number): string {
  throw new Error("not implemented");
}

// Co-authored-by trailers
export function parseCoAuthors(message: string): { name: string; email: string }[] {
  throw new Error("not implemented");
}
