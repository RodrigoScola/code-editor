export interface Worktree {
  path: string;
  head: string;
  // without refs/heads/; undefined when detached
  branch?: string;
  detached: boolean;
  locked: boolean;
  bare: boolean;
}

// `git worktree list --porcelain`
export function parseWorktreeList(output: string): Worktree[] {
  throw new Error("not implemented");
}
