import assert from 'assert';
import path from 'path';
import { UiComponent } from '../../../ui/components/UiComponent.js';
import { UiInput } from '../../../ui/components/UiInput.js';
import { EditorContext } from '../../EditorContext.js';

export class TreeInput extends UiInput {
  path: string;
  parent() {
    return super.parent() as TreeInput | null;
  }
  children(): TreeInput[] {
    return super.children() as TreeInput[];
  }
  isDirectory: boolean;
  folded: boolean;

  onFocus(): void {
    assert(
      this.buffer().count() == 1 && this.multiLine() == false,
      "has more than one  count on focus",
    );

    this.cursor().setBuffer(this.buffer());
    this.setCursorEnabled(true);
  }
  onBlur(): void {
    assert(
      this.buffer().count() == 1 && this.multiLine() == false,
      "added more than one line while on focus",
    );
    this.setCursorEnabled(false);
    this.cursor().setBuffer(this.buffer());
  }

  constructor(
    path: string,
    name: string,
    isDirectory: boolean,
    folded: boolean,
  ) {
    super(name);
    this.path = path;
    this.setName(name);
    this.isDirectory = isDirectory;
    this.folded = folded;
    this.setCursorEnabled(false);

    assert(
      this.buffer().count() == 1 && this.multiLine() == false,
      "has more than one line on buffer creation. " + this.buffer().count(),
    );
  }
  onEnter(ctx: EditorContext): void {
    super.onEnter(ctx);
    const fileName = this.buffer().at(this.currentCommandLine);
    assert(fileName, `trying to save file with invalid filename`);

    // a new-file input's path is the folder it goes in; a real node's path
    // is the file or folder itself
    const creating = !this.name();
    const folder = creating ? this.path : path.dirname(this.path);
    const target = path.join(folder, fileName);

    const finish = () => {
      ctx.setMode("normal");
      ctx.focusPrevious();
    };

    // the name wasn't changed: nothing to do
    if (!creating && target === this.path) {
      finish();
      return;
    }

    // a change of case only (a.txt -> A.txt) is the same file on Windows and
    // macOS, so fileExists is true for it, but it is still a rename
    const caseOnly =
      !creating && target.toLowerCase() === this.path.toLowerCase();

    if (ctx.fileExists(target) && !caseOnly) {
      // add notification
      return;
    }

    if (creating) {
      if (fileName.endsWith("/")) {
        ctx.newDirectory(target);
      } else {
        ctx.newFile(target);
      }
    } else {
      ctx.renameFile(this.path, target);
      this.setName(fileName);
      this.setPath(target);
    }

    finish();
  }

  // moves this node, and everything under it, to a new path
  setPath(newPath: string) {
    this.path = newPath;
    for (const child of this.children()) {
      child.setPath(path.join(newPath, child.name()!));
    }
  }
  defaultFocus(): UiComponent | null {
    return this;
  }
  save() {}
}
