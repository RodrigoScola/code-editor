import fs, { Dirent } from "fs";
import path from "path";
import colors from "../../ui/colors.js";
import { Canvas } from "../../ui/canvas.js";
import { Cursor } from "../Cursor.js";
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

class TreeInput extends UiInput {
  path: string;
  parent() {
    return super.parent() as TreeInput | null;
  }
  children(): TreeInput[] {
    return super.children() as TreeInput[];
  }
  isDirectory: boolean;
  folded: boolean;

  constructor(
    path: string,
    name: string,
    isDirectory: boolean,
    folded: boolean,
  ) {
    super();
    this.path = path;
    this.setName(name);
    this.isDirectory = isDirectory;
    this.folded = folded;
    this.setCursorEnabled(false);
  }
}

export class FileTreeWindow extends UIScreen {
  root: TreeInput;
  ignoreDirs: string[] = [];

  ignoreFileExt: string[] = [];

  constructor(dir: string) {
    super();

    this.cursor().style = ComponentStyle.Create()
      .setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND)

      .setColor(colors.WHITE_FOREGROUND);

    this.root = new TreeInput(".", dir, true, false);

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

        true,
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

      if (entry.isDirectory) {
        this.walkTree(path.join(dir, entry.name()!), entry);
      }
    }
  }

  onPrePaint(): void {
    this.cursor().width = this.view().contentLayout().width;
  }

  treeToBuffer() {
    const buffer = new TextBuffer();

    const totalChildren = this.count();

    for (let i = 0; i < totalChildren; i++) {
      const line = this.at(i);
      if (line) {
        buffer.addLine(line);
      }
    }
    return buffer;
  }

  onPostPaint(canvas: Canvas): void {
    super.paint(canvas);
    canvas.fillRect(this.view().contentLayout(), this.view().styles());
    let total = 0 + this.view().contentLayout().y;

    this.paintChild(this.root, total, -1, canvas);
    this.cursor().paint(canvas);
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

      let label = node.name() + ``;

      if (node.isDirectory == true) {
        label =
          (node.folded ? ICONS.arrow.triangleRight : ICONS.arrow.triangleDown) +
          label;
      }

      canvas.drawText(bounds, label, this.view().styles());
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
    this.cursor().line = Math.min(total, this.cursor().line + 1);
  }

  moveCursorUp(): void {
    this.cursor().line = Math.max(0, this.cursor().line - 1);
  }
  onEvent(event: EditorEvents): void {}
  onEnter(ctx: EditorContext): void {
    const node = this.getNodeAtIndex(this.root, this.cursor().line);

    if (!node) return;

    if (node.isDirectory) {
      node.folded = !node.folded;
    } else if (!node.isDirectory) {
      const editor = ctx.openFile(node?.path);

      if (editor) ctx.focus(editor);
    }
  }
}
