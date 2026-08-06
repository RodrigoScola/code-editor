import fs from "fs";
import path from "path";
import { Canvas } from "../../ui/canvas.js";
import { DisplayComponent } from "../../ui/components.js";
import { Cursor } from "../Cursor.js";

type TreeNode = {
  name: string;
  path: string;
  children: TreeNode[];
  parent: TreeNode | null;
};

export class FileTreeWindow extends DisplayComponent {
  root: TreeNode;
  ignoreDirs: string[] = [];

  cursor: Cursor = new Cursor();

  ignoreFileExt: string[] = [];

  constructor(dir: string) {
    super();

    this.root = {
      path: "",
      children: [],
      name: dir,
      parent: null,
    };

    this.walkTree(dir, this.root);
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
        path: path.join(node.path, entry.path),
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
    let total = 0 + this.contentLayout().y;

    this.paintChild(this.root, total, 0, canvas);
  }
  private paintChild(
    node: TreeNode,
    y: number,
    indent: number,
    canvas: Canvas,
  ): number {
    if (y >= this.contentLayout().y + this.contentLayout().height) {
      return y;
    }

    canvas.drawText(
      this.contentLayout().x + indent * 2,
      y,
      node.name,
      this.styles(),
    );

    y++;

    for (const child of node.children) {
      y = this.paintChild(child, y, indent + 1, canvas);

      if (y >= this.contentLayout().y + this.contentLayout().height) {
        break;
      }
    }

    return y;
  }
}
