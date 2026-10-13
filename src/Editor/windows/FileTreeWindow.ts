import fs, { Dirent } from "fs";
import path from "path";
import colors from "../../ui/colors.js";
import { Canvas } from "../../ui/canvas.js";
import {
  EditorView,
  UiComponent,
  UIScreen,
} from "../../ui/components/UiComponent.js";
import { EditorContext } from "../Editor/Editor.js";
import { ComponentStyle } from "../../ui/ComponentStyles.js";
import { ICONS } from "../../constants.js";
import { ViewPort } from "../../ui/windows/viewport.js";
import { LayoutBounds } from "../../ui/layout/layoutStyle.js";
import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { UiInput } from "../../ui/components/UiInput.js";
import { assert } from "../../assert.js";

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

export class FileTreeWindow extends UIScreen {
  root: TreeInput;
  ignoreDirs: string[] = [];

  ignoreFileExt: string[] = [];

  files: Map<string, TreeInput> = new Map();
  private _defaultFolded: boolean = true;

  // where the node being renamed or created was drawn this frame: x is where
  // its text starts (after the folder arrow). The nodes aren't in the render
  // tree, so the tree paints that node's cursor and selection itself
  private editing: { node: TreeInput; x: number; y: number } | null = null;

  defaultFolded() {
    return this._defaultFolded;
  }
  setDefaultFolded(val: boolean) {
    this._defaultFolded = val;

    return this;
  }

  constructor(dir: string) {
    super();

    assert(typeof dir === "string", `expected string, got:${typeof dir}`);

    this.cursor().style = ComponentStyle.Create()
      .setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND)

      .setColor(colors.WHITE_FOREGROUND);

    this.root = new TreeInput(dir, dir, true, false);

    this.refresh();
  }

  setIgnoreDirs(newVal: string[]) {
    this.ignoreDirs = newVal;
    this.refresh();
    return this;
  }
  setIgnoreFileExt(newVal: string[]) {
    this.ignoreFileExt = newVal;
    this.refresh();
    return this;
  }

  refresh() {
    assert(this.root.name(), "invalid name to root");
    assert(typeof this.root.name() === "string", `root name has to be string`);
    this.walkTree(this.root.name()!, this.root);

    // the tree is its own BufferLike (at/count walk the visible nodes), so
    // the cursor always sees folding, renames and new inputs
    this.cursor().setBuffer(this);
    this.syncBuffer();
    return this;
  }

  // the view's buffer is a copy of the visible rows (for buffer() and
  // ctx.lines()), rebuilt whenever the rows can change
  private syncBuffer() {
    this.view().content().setBuffer(this.treeToBuffer());
  }

  private formatNodes(
    dir: string,
    parent: TreeInput,
    entries: Dirent<string>[],
  ): TreeInput[] {
    const ignoreDirs = new Set(this.ignoreDirs);

    const nodes: TreeInput[] = [];

    for (const entry of entries) {
      const tempNode = new TreeInput(
        path.join(dir, entry.name),
        entry.name,
        entry.isDirectory(),
        this._defaultFolded,
      );
      assert(
        tempNode.name(),
        `invalid name on node, child of ${parent.name()}`,
      );

      if (ignoreDirs.has(tempNode.name()!)) {
        continue;
      } else if (this.ignoreFileExt.some((f) => tempNode.name()!.endsWith(f))) {
        continue;
      }
      nodes.push(tempNode);
    }

    return nodes.sort(
      (a, b) => (b.isDirectory ? 1 : -1) - (a.isDirectory ? 1 : -1),
    );
  }

  walkTree(dir: string, node: TreeInput) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    node.clearChildren();

    for (const entry of this.formatNodes(dir, node, entries)) {
      node.addChildren(entry);
      this.files.set(entry.path, entry);

      if (entry.isDirectory) {
        this.walkTree(entry.path, entry);
      }
    }
  }

  onPrePaint(): void {
    this.syncBuffer();
    this.cursor().width = this.view().contentLayout().width;
    const cl = this.view().contentLayout();
    this.view().viewport().ensureVisible(cl.width, cl.height);
    this.cursor().ensureVisible(this.view().viewport());
  }

  treeToBuffer() {
    const buffer = new TextBuffer();

    const totalChildren = this.count();

    // an empty row (a new-file input) still takes a line, so rows match
    // the tree's line numbers
    for (let i = 0; i < totalChildren; i++) {
      buffer.addLine(this.at(i) ?? "");
    }
    return buffer;
  }

  onPostPaint(canvas: Canvas): void {
    super.paint(canvas);
    canvas.fillRect(this.view().contentLayout(), this.view().styles());
    let total = 0 + this.view().contentLayout().y;

    this.editing = null;
    this.paintChild(this.root, total, -1, canvas);

    if (this.editing) {
      this.paintEditing(canvas);
    } else {
      this.cursor().paint(canvas);
    }
    this.cursor().selection?.styles.setBackgroundColor(
      colors.YELLOW_BACKGROUND,
    );
    if (this.cursor().hasSelection()) {
      this.cursor().paintSelection(canvas);
    }
  }
  // the selection and text cursor of the node being edited, on its row
  private paintEditing(canvas: Canvas) {
    assert(this.editing, "no node is being edited");
    const { node, x, y } = this.editing;
    const layout = this.view().contentLayout();
    const right = layout.x + layout.width;
    const text = node.buffer().at(0) ?? "";

    const selection = node.cursor().selection;
    if (selection) {
      for (const bound of selection.bounds(node.buffer())) {
        const from = x + bound.x;
        const width = Math.min(bound.width, right - from);
        if (width <= 0) continue;

        const at = { x: from, y, width, height: 1 };
        canvas.fillRect(at, selection.styles);
        canvas.drawText(at, text.slice(bound.x, bound.x + width));
      }
    }

    const cursorX = x + node.cursor().column;
    if (cursorX >= layout.x && cursorX < right) {
      canvas.drawText(
        { x: cursorX, y, width: 1, height: 1 },
        text[node.cursor().column] ?? " ",
        node.cursor().style,
      );
    }
  }

  private paintChild(
    node: TreeInput,
    y: number,
    indent: number,
    canvas: Canvas,
  ): number {
    const layout = this.view().contentLayout();
    const viewport = this.view().viewport();

    const viewportPosition = viewport.bufferToViewPort({
      x: indent * 2,
      y,
    });

    const screenX = layout.x + viewportPosition.x;
    const screenY = layout.y + viewportPosition.y;

    const viewportBottom = layout.y + layout.height;

    // The node is below the viewport. Since children come after
    // their parent, nothing further down can be visible either.
    if (screenY >= viewportBottom) {
      return y;
    }

    // Only paint when the node is inside the visible area.
    if (screenY >= layout.y && screenY < viewportBottom) {
      const bounds: LayoutBounds = {
        x: screenX,
        y: screenY,
        width: layout.width - viewportPosition.x,
        height: 1,
      };

      const icon = node.isDirectory
        ? node.folded
          ? ICONS.arrow.triangleRight
          : ICONS.arrow.triangleDown
        : "";
      const label = icon + node.buffer().content();

      canvas.drawText(bounds, label, this.view().styles());

      if (node.isFocused() && this.getNodeAt(this.cursor().line) === node) {
        this.editing = { node, x: screenX + icon.length, y: screenY };
      }
    }

    y++;

    if (node.isDirectory && node.folded) {
      return y;
    }

    for (const child of node.children()) {
      y = this.paintChild(child, y, indent + 1, canvas);

      // Once we've gone past the viewport, stop traversing.
      const childViewportPosition = viewport.bufferToViewPort({
        x: 0,
        y,
      });

      if (layout.y + childViewportPosition.y >= viewportBottom) {
        break;
      }
    }

    return y;
  }
  at(line: number): string | undefined {
    return this.getNodeAtIndex(this.root, line)?.name()!;
  }

  private getNodeCount(node: TreeInput): number {
    let count = 1; // this node
    if (node.isDirectory && node.folded) return count; // children are hidden
    for (const child of node.children()) count += this.getNodeCount(child);
    return count;
  }

  count() {
    return this.getNodeCount(this.root);
  }
  getNodeAt(line: number) {
    return this.getNodeAtIndex(this.root, line);
  }

  getIndex(node: TreeInput) {
    return this.walkIndex(this.root, node, 0);
  }
  private walkIndex(root: TreeInput, target: TreeInput, ind: number): number {
    if (root === target) return ind;

    if (root.isDirectory && root.folded) return -1;

    let index = ind + 1;
    for (const child of root.children()) {
      const childIndex = this.walkIndex(child, target, index);
      if (childIndex !== -1) return childIndex;
      index += this.getNodeCount(child);
    }

    return -1;
  }

  private getNodeAtIndex(
    node: TreeInput,
    target: number,
    index = { value: 0 },
  ): TreeInput | null {
    if (index.value === target) return node;
    index.value++;
    if (node.isDirectory && node.folded) return null; // same rule as paintChild
    for (const child of node.children()) {
      const result = this.getNodeAtIndex(child, target, index);
      if (result) return result;
    }
    return null;
  }

  moveCursorDown(): void {
    const total = this.count();
    this.cursor().line = Math.min(total - 1, this.cursor().line + 1);
  }

  moveCursorUp(): void {
    this.cursor().line = Math.max(0, this.cursor().line - 1);
  }
  onEnter(ctx: EditorContext): void {
    const node = this.getNodeAtIndex(this.root, this.cursor().line);

    if (!node) return;
    this.select(node, ctx);
  }
  private select(node: TreeInput, ctx: EditorContext) {
    const ind = this.getIndex(node);

    if (ind !== -1) {
      this.cursor().scrollTo(ind, this.cursor().column);
    }

    try {
      if (node.isDirectory) {
        node.folded = !node.folded;
        this.syncBuffer();
      } else if (!node.isDirectory) {
        const editor = ctx.openFile(node?.path);

        if (editor) ctx.focus(editor);
      }
    } catch (err) {
      console.error(`prob context is not defined`);
    }
  }
  createNewFileInput() {
    const cursor = this.cursor();
    const currentNode = this.getNodeAt(cursor.line);
    assert(currentNode, `invalid node at ${cursor.line}`);

    let parent = currentNode.parent();

    if (currentNode.isDirectory) {
      parent = currentNode;
    } else {
      parent = currentNode.parent();
    }
    assert(parent, `invalid parent for new file`);

    // its path is the folder the new file goes in (see TreeInput.onEnter)
    const input = new TreeInput(parent.path, "", false, false);

    parent.addChildAt(input, cursor.line);
    this.syncBuffer();
    this.moveCursorDown();

    return input;
  }
  reveal(p: string) {
    const hasFile = this.files.get(p);

    if (!hasFile) {
      console.error("could not find the thing");
      return;
    }

    let parent = hasFile.parent();

    while (parent) {
      parent.folded = false;
      parent = parent.parent();
    }
    this.select(hasFile, EditorContext.instance!);
    console.log("finalized");
  }

  deleteNodeAt(at: number, ctx: EditorContext): void {
    const node = this.getNodeAt(at);
    assert(node, `invalid input at position: ${at}`);

    if (node?.isDirectory) {
      ctx.removeDirectory(node.path);
    } else {
      ctx.removeFile(node!.path);
    }

    this.refresh();
  }
}
