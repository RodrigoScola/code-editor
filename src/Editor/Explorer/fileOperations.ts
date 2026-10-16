// What the Explorer does to files, kept apart from the tree UI

export interface FileNameProblem {
  severity: "error" | "warning";
  message: string;
}

// null when the name is fine
export function validateFileName(
  name: string,
  options: { folderEntries: string[]; platform: string },
): FileNameProblem | null {
  throw new Error("not implemented");
}

// explorer.incrementalNaming: simple "a copy.ts", "a copy 2.ts"; smart
// "file1.txt" -> "file2.txt", "file.txt" -> "file.1.txt"
export function incrementFileName(name: string, isFolder: boolean, mode: "simple" | "smart"): string {
  throw new Error("not implemented");
}

export class FileOperations {
  // trash(path) is called instead of a permanent delete when given
  constructor(options: { trash?: (path: string) => void } = {}) {}

  // "a/b/c.ts" creates the folders too; throws when it exists
  createFile(folder: string, name: string): void {
    throw new Error("not implemented");
  }

  createFolder(folder: string, name: string): void {
    throw new Error("not implemented");
  }

  rename(path: string, newName: string): void {
    throw new Error("not implemented");
  }

  delete(path: string): void {
    throw new Error("not implemented");
  }

  copy(paths: string[]): void {
    throw new Error("not implemented");
  }

  cut(paths: string[]): void {
    throw new Error("not implemented");
  }

  // next to the original picks a new name; a cut pastes once; throws for a
  // folder pasted into itself
  paste(targetFolder: string): void {
    throw new Error("not implemented");
  }

  duplicate(path: string): void {
    throw new Error("not implemented");
  }

  // the last create, rename, move or copy
  undo(): void {
    throw new Error("not implemented");
  }

  redo(): void {
    throw new Error("not implemented");
  }
}
