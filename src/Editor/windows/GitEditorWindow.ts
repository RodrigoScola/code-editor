import { EditorContext } from "../Editor/Editor.js";
import path from "path";
import cp from "child_process";
import { GitEntry } from "../../tools/Git/gitEntry.js";
import { gitStatus } from "../../tools/Git/git.js";
import { UIScreen } from "../../ui/components/UIScreen.js";

export class GitEditorWindow extends UIScreen {
  private status: GitStatus | null = null;

  private root: string | null;

  constructor(root: string | null) {
    super();
    this.root = root;

    this.reload();
  }
  reload() {
    if (this.root) {
      this.status = gitStatus(this.root);
    }
    this.display();
  }

  display() {
    this.buffer().append("Staged Files: ");
    if (!this.status) {
      return;
    }

    const staged = this.status.files.filter((file: GitEntry) =>
      file.isStaged(),
    );

    for (const file of staged) {
      this.buffer().append(` ${file.index} -> ${file.path}`);
    }

    this.buffer().append("Unstaged Files:");
    const unstaged = this.status.files.filter((file) => file.isUnstaged());
    for (const file of unstaged) {
      this.buffer().append(` ${file.worktree} -> ${file.path}`);
    }
  }
  onEvent(event: EditorEvents): void {
    if (event.name === "editorModeChange") {
    }
  }
  onEnter(ctx: EditorContext): void {
    const line = this.buffer().at(this.cursor().line);
    if (!line) {
      return;
    }
    const file = line.split(" ").at(-1);
    if (!file) {
      return;
    }
    cp.execSync(`git add ${path.join(file)}`);

    this.reload();
    EditorContext.instance?.requestRepaint();
  }
}
