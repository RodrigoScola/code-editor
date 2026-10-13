import { EditorContext } from "../Editor/Editor.js";
import { UIScreen } from "../../ui/components/UiComponent.js";
import path from "path";
import cp from "child_process";
import { GitEntry } from "../../tools/Git/gitEntry.js";
import { gitStatus, parseStatus } from "../../tools/Git/git.js";

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
    this.buffer().addLine("Staged Files: ");
    if (!this.status) {
      return;
    }

    const staged = this.status.files.filter((file: GitEntry) =>
      file.isStaged(),
    );

    for (const file of staged) {
      this.buffer().addLine(` ${file.index} -> ${file.path}`);
    }

    this.buffer().addLine("Unstaged Files:");
    const unstaged = this.status.files.filter((file) => file.isUnstaged());
    for (const file of unstaged) {
      this.buffer().addLine(` ${file.worktree} -> ${file.path}`);
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
