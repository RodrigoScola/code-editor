import path from "path";
import fs from "fs";

export class FileSystem {
  listDirectoryItems(dir: string, ignoreDirs: string[]): string[] {
    const ignoreSet = new Set(ignoreDirs);
    const allEntries: string[] = [];

    const walk = (current: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch (err) {
        // skip folders we aren't allowed to read instead of failing the whole walk
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "EACCES" || code === "EPERM") {
          return;
        }
        throw err;
      }

      for (const entry of entries) {
        if (ignoreSet.has(entry.name)) {
          continue;
        }
        const p = path.join(current, entry.name);
        allEntries.push(p);

        // symlinked folders report false here, so link loops can't recurse forever
        if (entry.isDirectory()) {
          walk(p);
        }
      }
    };

    walk(dir);
    return allEntries;
  }
}
