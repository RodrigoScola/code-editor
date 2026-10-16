// The commit message box

export interface CommitMessageWarning {
  line: number;
  severity: "warning";
  // "8 characters over 50 in current line"
  message: string;
}

// git.inputValidation; lines starting with # are not checked
export function validateCommitMessage(
  message: string,
  options: { subjectLength?: number; length?: number },
): CommitMessageWarning[] {
  throw new Error("not implemented");
}

// Up / Down in the commit box
export class CommitInputHistory {
  add(message: string): void {
    throw new Error("not implemented");
  }

  // stops at the oldest
  previous(): string {
    throw new Error("not implemented");
  }

  next(): string {
    throw new Error("not implemented");
  }
}
