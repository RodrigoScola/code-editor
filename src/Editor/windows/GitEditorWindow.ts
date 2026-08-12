import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { EditorContext } from "../Editor.js";
import { EditorWindow } from "./EditorWindow.js";
import path from "path";
import cp from "child_process";

type GitFileStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "type changed"
  | "unmerged/conflict"
  | "unknown"
  | "broken pairing";

class GitFile {
  stagedStatus: GitFileStatus | null = null;
  unstagedStatus: GitFileStatus | null = null;
  path: string = "";

  isStaged(): boolean {
    return Boolean(this.stagedStatus);
  }

  isUnstaged(): boolean {
    return Boolean(this.unstagedStatus);
  }

  static GetFileStatusByKey(key: string): GitFileStatus | null {
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
      case " ":
        return null;
      default:
        throw new Error(`invalid key status ${key}`);
    }
  }
}

export class GitEditorWindow extends EditorWindow {
  private files: GitFile[] = [];

  constructor() {
    super();
    this.requestData();
  }

  requestData() {
    this.files = [];
    this.buffer = new TextBuffer();

    const gitFiles = cp
      .execSync("git status --short", { encoding: "utf-8" })
      .split(/\r?\n/)
      .filter(Boolean);

    for (const line of gitFiles) {
      const f = new GitFile();

      const stagedKey = line[0];
      const unstagedKey = line[1];

      f.stagedStatus = GitFile.GetFileStatusByKey(stagedKey);
      f.unstagedStatus = GitFile.GetFileStatusByKey(unstagedKey);

      f.path = line.slice(3);

      this.files.push(f);
    }

    this.display();
  }
  display() {
    this.buffer.addLine("Staged Files: ");
    const staged = this.files.filter((file) => file.isStaged());

    for (const file of staged) {
      this.buffer.addLine(` ${file.stagedStatus} -> ${file.path}`);
    }

    this.buffer.addLine("Unstaged Files:");
    const unstaged = this.files.filter((file) => file.isUnstaged());
    for (const file of unstaged) {
      this.buffer.addLine(` ${file.unstagedStatus} -> ${file.path}`);
    }
  }
  onEnter(ctx: EditorContext): void {
    const line = this.buffer.at(this.cursor.line);
    if (!line) {
      return;
    }
    const file = line.split(" ").at(-1);
    if (!file) {
      return;
    }
    cp.execSync(`git add ${path.join(file)}`);
    this.requestData();
    EditorContext.instance?.requestRepaint();
  }
}
