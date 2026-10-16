// Hot exit (files.hotExit): unsaved changes are written to backups so they
// come back after a restart

export class BackupStore {
  // backups are files in this folder, so a new store on it reads them back
  constructor(folder: string) {}

  backup(path: string, text: string): void {
    throw new Error("not implemented");
  }

  discard(path: string): void {
    throw new Error("not implemented");
  }

  // the paths that have a backup
  list(): string[] {
    throw new Error("not implemented");
  }

  read(path: string): string | undefined {
    throw new Error("not implemented");
  }
}
