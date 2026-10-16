// The 3-way merge editor (Open in Merge Editor)

// a region where both sides changed the same lines differently
export interface MergeEditorConflict {
  id: number;
  base: string[];
  input1: string[];
  input2: string[];
  handled: boolean;
}

export class MergeModel {
  // input1 = incoming, input2 = current
  constructor(base: string, input1: string, input2: string) {}

  conflicts(): MergeEditorConflict[] {
    throw new Error("not implemented");
  }

  // both = input1 then input2
  accept(id: number, side: "input1" | "input2" | "both"): void {
    throw new Error("not implemented");
  }

  // back to the base, unresolved again
  reset(id: number): void {
    throw new Error("not implemented");
  }

  result(): string {
    throw new Error("not implemented");
  }

  unresolvedCount(): number {
    throw new Error("not implemented");
  }

  // true when nothing is unresolved (the file can be staged)
  complete(): boolean {
    throw new Error("not implemented");
  }
}
