// Multi-root workspaces (.code-workspace files)

export interface WorkspaceFolder {
  name: string;
  path: string;
}

export interface WorkspaceFile {
  folders: WorkspaceFolder[];
  settings: Record<string, unknown>;
  launch?: Record<string, unknown>;
  tasks?: Record<string, unknown>;
}

// relative folder paths resolve against the file's folder; name defaults to
// the folder's name; the same folder twice appears once
export function parseWorkspaceFile(path: string, jsonc: string): WorkspaceFile {
  throw new Error("not implemented");
}

// the deepest folder containing file
export function folderFor(folders: WorkspaceFolder[], file: string): WorkspaceFolder | undefined {
  throw new Error("not implemented");
}

// "Name/relative/path" with several folders, the relative path with one
export function labelFor(folders: WorkspaceFolder[], file: string): string {
  throw new Error("not implemented");
}

// a search include starting with ./Name/ limits the search to that folder
export function scopeInclude(
  folders: WorkspaceFolder[],
  include: string,
): { folder: string | undefined; pattern: string } {
  throw new Error("not implemented");
}

export interface RecentEntry {
  kind: "file" | "folder" | "workspace";
  path: string;
}

export class RecentlyOpened {
  constructor(options: { max: number }) {}

  add(entry: RecentEntry): void {
    throw new Error("not implemented");
  }

  // newest first, no repeats
  list(): RecentEntry[] {
    throw new Error("not implemented");
  }

  remove(path: string): void {
    throw new Error("not implemented");
  }

  // drops entries that are gone
  prune(exists: (path: string) => boolean): void {
    throw new Error("not implemented");
  }
}
