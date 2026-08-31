import fs from "fs";
import path from "path";
import colors from "../../ui/colors.js";
import { Canvas } from "../../ui/canvas.js";
import { Cursor } from "../Cursor.js";
import { EditorWindow } from "./EditorWindow.js";
import { EditorContext } from "../Editor/Editor.js";
import { ComponentStyle } from "../../ui/ComponentStyles.js";
import { ICONS } from "../../constants.js";
import { ViewPort } from "../../ui/windows/viewport.js";

type TreeNode = DirectoryTreeNode | FileTreeNode;

type TreeNodeBase = {
  name: string;
  path: string;
  children: TreeNode[];
  parent: TreeNode | null;
};

type DirectoryTreeNode = TreeNodeBase & {
  isDirectory: true;
  folded: boolean;
};

type FileTreeNode = TreeNodeBase & {
  isDirectory: false;
};

export class FileTreeWindow extends EditorWindow {
  root: TreeNode;
  ignoreDirs: string[] = [];

  cursor: Cursor = new Cursor();

  ignoreFileExt: string[] = [];

  constructor(dir: string) {
    super();

    this.root = {
      path: "",
      children: [],
      isDirectory: true,
      name: dir,
      parent: null,
    };

    this.walkTree(dir, this.root);
  }
  isDirectoryNode(node: TreeNode): node is DirectoryTreeNode {
    return node.isDirectory === true;
  }
  isFileNode(node: TreeNode): node is FileTreeNode {
    return node.isDirectory === false;
  }

  setIgnoreDirs(newVal: string[]) {
    this.ignoreDirs = newVal;
    this.walkTree(this.root.name, this.root);
    return this;
  }
  setIgnoreFileExt(newVal: string[]) {
    this.ignoreFileExt = newVal;
    this.walkTree(this.root.name, this.root);
    return this;
  }

  refresh() {
    this.walkTree(this.root.name, this.root);
  }

  walkTree(
    dir: string,
    node: TreeNode,
    ignoreDirs: Set<string> = new Set(this.ignoreDirs),
  ) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    node.children = [];

    for (const entry of entries) {
      const child: TreeNode = {
        name: entry.name,
        children: [],
        isDirectory: entry.isDirectory(),
        path: path.join(dir, entry.name),
        parent: node,
      };

      if (ignoreDirs.has(entry.name)) {
        continue;
      }
      if (this.ignoreFileExt.some((file) => entry.name.endsWith(file))) {
        continue;
      }

      node.children.push(child);

      if (entry.isDirectory()) {
        this.walkTree(path.join(dir, entry.name), child);
      }
    }
  }

  paint(canvas: Canvas): void {
    const cl = this.window.contentLayout();
    this.window.viewport().ensureVisible(cl.width, cl.height);
    this.cursor.ensureVisible(this.window.viewport());
    let total = 0 + this.window.contentLayout().y;

    this.paintChild(this.root, total, -1, canvas);
  }
  private paintChild(
    node: TreeNode,
    y: number,
    indent: number,
    canvas: Canvas,
  ): number {
    const layout = this.window.contentLayout();
    const viewport = this.window.viewport();

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

      if (y === this.cursor.line) {
        canvas.fillRect(
          {
            x: layout.x,
            y: screenY,
            width: layout.width,
            height: 1,
          },
          ComponentStyle.Create()
            .setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND)
            .setColor(colors.WHITE_FOREGROUND),
        );
      }

      let label = node.name;

      if (this.isDirectoryNode(node)) {
        label =
          (node.folded ? ICONS.arrow.triangleRight : ICONS.arrow.triangleDown) +
          label;
      }

      canvas.drawText(bounds, label, this.window.styles());
    }

    y++;

    if (this.isDirectoryNode(node) && node.folded) {
      return y;
    }

    for (const child of node.children) {
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
    return this.getNodeAtIndex(this.root, line)?.name;
  }
  count(): number {
    return this.getNodeCount(this.root);
  }
  private getNodeCount(node: TreeNode): number {
    let count = 1; // count this node

    for (const child of node.children) {
      count += this.getNodeCount(child);
    }

    return count;
  }

  private getNodeAtIndex(
    node: TreeNode,
    target: number,
    index = { value: 0 },
  ): TreeNode | null {
    if (index.value === target) {
      return node;
    }

    index.value++;

    for (const child of node.children) {
      const result = this.getNodeAtIndex(child, target, index);

      if (result) {
        return result;
      }
    }

    return null;
  }
  moveCursorDown(): void {
    return this.cursor.moveDown(this);
  }

  moveCursorUp(): void {
    return this.cursor.moveUp(this);
  }
  onEvent(event: EditorEvents): void {}
  onEnter(ctx: EditorContext): void {
    const node = this.getNodeAtIndex(this.root, this.cursor.line);

    if (!node) return;

    if (this.isDirectoryNode(node)) {
      node.folded = !node.folded;
    } else if (this.isFileNode(node)) {
      const editor = ctx.openFile(node?.path);

      if (editor) ctx.focus(editor);
    }
  }
}
