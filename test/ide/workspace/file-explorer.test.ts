import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { FileTreeWindow } from "../../../src/Editor/windows/FileTreeWindow.js";
import { Canvas } from "../../../src/ui/canvas.js";
import { LayoutEngine } from "../../../src/ui/layout/layout.js";
import { Renderer } from "../../../src/ui/renderer.js";
import { vim, workspace } from "../harness.js";

// The file tree, like nvim-tree or VS Code's explorer:
// - folders first, then files, each sorted by name
// - folders start collapsed (the root is open)
// - j/k move, <CR> on a folder opens/closes it, <CR> on a file opens it
// - a: create (a name ending in "/" makes a folder), r: rename,
//   d: delete (asks y/n), R: re-read the disk
// - the tree's keys only apply while it has focus; a prompt for a name
//   shows in the status line
// - tree.reveal(path) opens the folders down to a file and selects it

function project() {
  return workspace({
    "b.txt": "b",
    "a.txt": "a",
    "src/x.ts": "x",
    "lib/y.ts": "y",
  });
}

// the tree inside an editor, focused, as the user would use it
function explorer(root: string) {
  const ide = vim("|", { width: 30, height: 20 });
  const tree = new FileTreeWindow(root);
  ide.addSidebar(tree);
  ide.ctx.focus(tree);
  return { ide, tree };
}

// the tree drawn on its own
function rows(tree: FileTreeWindow) {
  const bounds = LayoutEngine.CreateBounds(40, 15);
  const canvas = new Canvas().setLayout(bounds);
  tree.view().setLayout(LayoutEngine.CreateBounds(40, 15));
  LayoutEngine.Measure(tree, LayoutEngine.CreateConstraints(40, 15));
  LayoutEngine.Arrange(tree);
  Renderer.Create(canvas).build(tree);
  return canvas.getCells().map((row) =>
    row
      .map((tile) => tile.styles.display())
      .join("")
      .trim(),
  );
}

const selected = (tree: FileTreeWindow) => tree.at(tree.cursor().line);

describe("listing", () => {
  it("shows folders first, then files, sorted by name", () => {
    const tree = new FileTreeWindow(project());

    expect(tree.root.children().map((node) => node.name())).toEqual([
      "lib",
      "src",
      "a.txt",
      "b.txt",
    ]);
  });

  it("starts with folders collapsed", () => {
    const shown = rows(new FileTreeWindow(project())).join("\n");

    expect(shown).toContain("src");
    expect(shown).not.toContain("x.ts");
  });

  it("hides ignored folders", () => {
    const root = workspace({ "node_modules/m.js": "", "a.txt": "" });
    const tree = new FileTreeWindow(root).setIgnoreDirs(["node_modules"]);

    expect(rows(tree).join("\n")).not.toContain("node_modules");
  });
  it("hides ignored files", () => {
    const root = workspace({ "node_modules/m.js": "", "a.txt": "" });
    const tree = new FileTreeWindow(root).setIgnoreFileExt([".txt"]);

    expect(rows(tree).join("\n")).not.toContain("txt");
  });
});

describe("moving and opening", () => {
  it("j moves through what is shown, skipping inside collapsed folders", () => {
    const { ide, tree } = explorer(project());

    ide.keys("jj");

    console.log(selected(tree));

    expect(selected(tree)).eq("src");
  });

  it("<CR> on a folder expands it", () => {
    const { ide, tree } = explorer(project());
    expect(rows(tree).join("\n")).not.toContain("x.ts");

    ide.keys("jj<CR>");

    expect(selected(tree)).eq("src");

    expect(rows(tree).join("\n")).toContain("x.ts");
  });

  it("<CR> on a file opens it in the editor", () => {
    const root = project();
    const { ide } = explorer(root);

    ide.keys("jjj<CR>");

    expect(ide.window().document.file.path()).eq(join(root, "a.txt"));
  });
});

describe("changing files", () => {
  it("a creates a file in the selected folder", () => {
    const root = project();
    const { ide } = explorer(root);

    ide.keys("jja").keys("new.ts<CR>");

    expect(existsSync(join(root, "src", "new.ts"))).eq(true);
  });

  it("a with a trailing / creates a folder", () => {
    const root = project();
    const { ide } = explorer(root);

    ide.keys("a").keys("docs/<CR>");

    expect(existsSync(join(root, "docs"))).eq(true);
  });

  it("r renames", () => {
    const root = project();
    const { ide, tree } = explorer(root);

    ide.keys("jjjr<C-u>c.txt<CR>");

    expect(existsSync(join(root, "a.txt"))).eq(false);
    expect(existsSync(join(root, "c.txt"))).eq(true);
    expect(tree.root.children.map((node) => node.name)).toContain("c.txt");
  });

  it("renaming an open file keeps its tab pointing at it", () => {
    const root = project();
    const { ide } = explorer(root);
    ide.keys("jjj<CR>");
    const window = ide.window();

    const tree = ide.ctx.findWindow(FileTreeWindow)!;
    ide.ctx.focus(tree);
    ide.keys("r<C-u>c.txt<CR>");

    expect(window.document.file.path()).eq(join(root, "c.txt"));
  });

  it("d asks before deleting", () => {
    const root = project();
    const { ide } = explorer(root);

    ide.keys("jjjdn");
    expect(existsSync(join(root, "a.txt"))).eq(true);

    ide.keys("dy");
    expect(existsSync(join(root, "a.txt"))).eq(false);
  });

  it("R picks up files created outside the editor", () => {
    const root = project();
    const { ide, tree } = explorer(root);
    writeFileSync(join(root, "late.txt"), "");

    ide.keys("R");

    expect(rows(tree).join("\n")).toContain("late.txt");
  });
});

describe("reveal", () => {
  it("opens the folders down to a file and selects it", () => {
    const root = project();
    const tree = new FileTreeWindow(root);

    tree.reveal(join(root, "src", "x.ts"));

    expect(selected(tree)).eq("x.ts");
    expect(rows(tree).join("\n")).toContain("x.ts");
  });
});
