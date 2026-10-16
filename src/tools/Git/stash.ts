export interface StashEntry {
  index: number;
  branch: string;
  description: string;
}

// `git stash list`: "stash@{0}: On main: msg", "stash@{1}: WIP on main:
// abc1234 subject"
export function parseStashList(output: string): StashEntry[] {
  throw new Error("not implemented");
}
