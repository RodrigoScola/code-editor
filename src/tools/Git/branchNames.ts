// Branch names

// spaces become git.branchWhitespaceChar, git.branchPrefix is added
export function sanitizeBranchName(
  name: string,
  options: { whitespaceChar?: string; prefix?: string },
): string {
  throw new Error("not implemented");
}

// null, or why git would refuse the name (git's ref name rules)
export function validateBranchName(name: string): string | null {
  throw new Error("not implemented");
}

// one word from each dictionary (git.branchRandomName)
export function randomBranchName(
  dictionaries: string[][],
  options: { separator: string; random: () => number },
): string {
  throw new Error("not implemented");
}

export function sortBranches<B extends { name: string; committerDate: number }>(
  branches: B[],
  order: "committerdate" | "alphabetically",
): B[] {
  throw new Error("not implemented");
}
