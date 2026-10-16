// Inline merge conflicts: <<<<<<< current, ||||||| base (diff3), =======,
// >>>>>>> incoming, each exactly 7 characters at the start of a line

export interface ConflictSide {
  label: string;
  lines: string[];
}

export interface MergeConflict {
  // the <<<<<<< and >>>>>>> lines
  startLine: number;
  endLine: number;
  current: ConflictSide;
  base?: ConflictSide;
  incoming: ConflictSide;
}

export type ConflictChoice = "current" | "incoming" | "both";

// a conflict without all its markers is ignored
export function findConflicts(text: string): MergeConflict[] {
  throw new Error("not implemented");
}

// line endings are kept as they are
export function resolveConflict(text: string, index: number, choice: ConflictChoice): string {
  throw new Error("not implemented");
}

export function resolveAll(text: string, choice: ConflictChoice): string {
  throw new Error("not implemented");
}
