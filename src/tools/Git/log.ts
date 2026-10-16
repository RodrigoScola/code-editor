// The Source Control Graph

export interface LogCommit {
  hash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  // ms
  authorDate: number;
  refs: string[];
  subject: string;
  message: string;
}

// `git log --format=%H%x00%P%x00%an%x00%ae%x00%at%x00%D%x00%B%x1e`
export function parseLog(output: string): LogCommit[] {
  throw new Error("not implemented");
}

export interface GraphRow {
  hash: string;
  // the lane the commit's dot is in
  column: number;
  // the commit each open lane is heading to, after this row
  lanes: string[];
}

// a first parent continues in the same lane; a merge's second parent opens
// a lane to its right; lanes close at a commit already placed
export function graphRows(commits: { hash: string; parents: string[] }[]): GraphRow[] {
  throw new Error("not implemented");
}

// hashes reachable from upstream but not head (incoming), and the other way
export function incomingOutgoing(
  commits: { hash: string; parents: string[] }[],
  head: string,
  upstream: string,
): { incoming: string[]; outgoing: string[] } {
  throw new Error("not implemented");
}
