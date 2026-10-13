import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { EditorContext } from "../Editor/Editor.js";
import { UiComponent, UIScreen } from "../../ui/components/UiComponent.js";
import path from "path";
import cp from "child_process";
import { ComponentStyle } from "../../ui/ComponentStyles.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components/displayComponent.js";
import { Canvas } from "../../ui/canvas.js";
import { gitStatus } from "../../tools/Git/git.js";
import { GitFile } from '../../tools/Git/gitFile.js';

export class GitCommitWindow extends UIScreen {
  private files: GitFile[] = [];
  constructor() {
    super();

    this.view()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
      )
      .setName("git_commit_window");

    const dp = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
    );

    this.view().addChildren(dp);

    this.files = gitStatus();

    const text = this.files.map((f) => f.path).join("\n");

    this.view().setContent(text);
  }
}

export class GitEditorWindow extends UIScreen {
  private files: GitFile[] = [];

  constructor() {
    super();
    this.requestData();
  }

  requestData() {
    this.files = [];

    this.files = gitStatus();

    this.display();
  }
  display() {
    this.buffer().addLine("Staged Files: ");
    const staged = this.files.filter((file) => file.isStaged());

    for (const file of staged) {
      this.buffer().addLine(` ${file.stagedStatus} -> ${file.path}`);
    }

    this.buffer().addLine("Unstaged Files:");
    const unstaged = this.files.filter((file) => file.isUnstaged());
    for (const file of unstaged) {
      this.buffer().addLine(` ${file.unstagedStatus} -> ${file.path}`);
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
    this.requestData();
    EditorContext.instance?.requestRepaint();
  }
}
