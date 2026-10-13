const valid_status_keys = [
  "A",
  "M",
  "D",
  "R",
  "C",
  "T",
  "U",
  "X",
  "B",
  "?",
  " ",
  "!",
] as const;

const validConflicts = ["DD", "AU", "UD", "UA", "DU", "AA", "UU"];

function isValidStatusKey(key: string) {
  if (key.length > 1) {
    return false;
  }

  //@ts-expect-error should throw an error
  return valid_status_keys.includes(key);
}

function getFileStatusByKey(key: string): GitFileStatus | null {
  switch (key) {
    case "A":
      return "added";

    case "M":
      return "modified";

    case "D":
      return "deleted";

    case "R":
      return "renamed";

    case "C":
      return "copied";

    case "T":
      return "type changed";

    case "U":
      return "unmerged/conflict";

    case "X":
      return "unknown";

    case "B":
      return "broken pairing";

    case "?":
      return "untracked";
    case "!":
      return "ignored";

    case " ":
      return null;

    default:
      console.error(`invalid key status ${key}`);
      return null;
  }
}

export class GitFile {
  stagedStatus: string | null = null;
  worktree: string | null = null;
  path: string = "";
  index: string = " ";
  from: string | null = null;

  constructor(entry?: string) {
    if (!entry) {
      return;
    }

    const stagedKey = entry[0];
    const unstagedKey = entry[1];

    this.stagedStatus = getFileStatusByKey(stagedKey);
    this.worktree = getFileStatusByKey(unstagedKey);

    this.path = entry.slice(3);
  }
  valid() {
    if (
      this.worktree &&
      isValidStatusKey(this.worktree) &&
      isValidStatusKey(this.index)
    ) {
      return true;
    }
    return false;
  }

  isStaged(): boolean {
    return Boolean(this.stagedStatus);
  }
  static ValidKey(char: string) {
    return isValidStatusKey(char)
  }

  isUnstaged(): boolean {
    return Boolean(this.worktree);
  }
  private isStatus(status: GitFileStatus) {
    if (this.worktree && getFileStatusByKey(this.worktree) === status) {
      return true;
    }

    if (this.index && getFileStatusByKey(this.index) === status) {
      return true;
    }
    return false;
  }
  renamed() {
    return this.isStatus("renamed");
  }
  copied() {
    return this.isStatus("copied");
  }
  conflict() {
    if (!this.worktree || !this.index) {
      return false;
    }

    const out = validConflicts.includes(`${this.worktree}${this.index}`);

    return out;
  }
}
