// Reading `git status --porcelain=v2 --branch -z` (NUL separated, so paths
// are never quoted)

export type StatusKind = "ordinary" | "renamed" | "unmerged" | "untracked" | "ignored";

export interface StatusFile {
  path: string;
  // renames and copies
  origPath?: string;
  // "." for unchanged, as git prints them
  index: string;
  worktree: string;
  kind: StatusKind;
}

export interface RepositoryStatus {
  // null before the first commit
  oid: string | null;
  head: string;
  detached: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  files: StatusFile[];
}

export function parseStatusV2(output: string): RepositoryStatus {
  throw new Error("not implemented");
}

// VS Code's Merge Changes, Staged Changes, Changes and Untracked Changes
export interface ResourceGroups {
  merge: StatusFile[];
  index: StatusFile[];
  workingTree: StatusFile[];
  untracked: StatusFile[];
}

export type ResourceGroupName = keyof ResourceGroups;

export function groupResources(
  files: StatusFile[],
  options: { untrackedChanges: "mixed" | "separate" | "hidden" },
): ResourceGroups {
  throw new Error("not implemented");
}

// for the Explorer and tabs: M modified, A added, D deleted, R renamed,
// C copied, U untracked, ! conflict
export interface FileDecoration {
  letter: string;
  color: string;
}

export function decorationFor(
  file: { index: string; worktree: string; kind: string },
  group: ResourceGroupName,
): FileDecoration {
  throw new Error("not implemented");
}

// the number on the Source Control icon (scm.countBadge)
export function countBadge(groups: ResourceGroups, mode: "all" | "focused" | "off"): number {
  throw new Error("not implemented");
}
