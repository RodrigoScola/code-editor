import { describe, it, expect, assert } from "vitest";
import { Textdocument, MemoryFile } from "./Documents/TextDocument.js";
import { TextEditorWindow } from "./windows/TextEditorWindow.js";
import { Canvas } from "../ui/canvas.js";
import { LayoutEngine } from "../ui/layout/layout.js";
import { Renderer } from "../ui/renderer.js";
import colors from "../ui/colors.js";
import { WindowManager } from "./WindowManager.js";
import { EditorRoot } from "./Editor/EditorRoot.js";
import { EditorWindow } from "./windows/EditorWindow.js";
import { isEditorWindow } from "../utils.js";
import { FileTreeWindow } from "./windows/FileTreeWindow.js";

describe("tests the window manager capabilities", () => {
  it("focus the correct window at the correct time", () => {
    const manager = new WindowManager(new EditorRoot());

    const editor = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "one\ntwo\nthree\n")),
    );

    const tree = new FileTreeWindow(".");

    manager.root.addChildren(editor.window).addChildren(tree.window);
    manager.add(editor).add(tree);

    manager.focus(editor);

    expect(editor.focused()).eq(true);
    expect(tree.focused()).eq(false);
    manager.focus(tree);

    expect(editor.focused()).eq(false);
    expect(tree.focused()).eq(true);
    const other = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "one\ntwo\nthree\n")),
    );

    manager.split(manager.activeWindow()!, other, "vertical");

    LayoutEngine.Measure(manager.root, manager.root.contentLayout());
    Renderer.Create().build(
      manager.root,
      new Canvas().setLayout({ x: 0, y: 0, height: 20, width: 20 }),
    );

    expect(manager.activeWindow()?.window.getId() === tree.window.getId());
    expect(manager.root.children().at(0)?.getId() === editor.window.getId()).eq(
      true,
    );
    expect(manager.root.children().at(1)?.children().length == 2).eq(true);
  });
  it("can split more than once", () => {
    const manager = new WindowManager(new EditorRoot());

    const editor = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "one\ntwo\nthree\n")),
    );
    editor.window.styles()?.setBackgroundColor(colors.YELLOW_BACKGROUND);

    const tree = new FileTreeWindow(".");
    tree.window.styles()?.setBackgroundColor(colors.BLUE_BACKGROUND);
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 20;

    manager.root
      .setLayout(layout)
      .addChildren(editor.window)
      .addChildren(tree.window)
      .styles();
    manager.add(editor).add(tree).focus(editor);

    const cnv = new Canvas().setLayout(layout);

    manager.focus(tree);

    const other = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "four\nfive\nsix")),
    );
    other.window.styles()?.setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);
    manager.split(manager.activeWindow()!, other, "horizontal");

    expect(manager.activeWindow()?.window.getId() === tree.window.getId());
    expect(manager.root.children().at(0)?.getId() === editor.window.getId()).eq(
      true,
    );
    expect(manager.root.children().at(1)?.children().length == 2).eq(true);

    const other2 = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "seven\neight\nnine")),
    );
    other2.window.styles()?.setBackgroundColor(colors.BRIGHT_RED_BACKGROUND);

    manager.split(other, other2, "vertical");

    LayoutEngine.Measure(manager.root, manager.root.contentLayout());
    Renderer.Create().build(manager.root, cnv);

    cnv.renderBoard();

    expect(manager.root.children().at(1)?.children().length == 2).eq(true);
    expect(
      manager.root.children().at(1)?.children().at(0)?.children().length == 2,
    );
  });
  it("can split a window in horizontal form", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.width = layout.height = 20;
    const cnv = new Canvas().setLayout(layout);
    const root = new EditorRoot().setLayout(layout);

    const manager = new WindowManager(root);

    const window = new EditorWindow();
    window.window.styles()?.setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND);

    root.addChildren(window.window);
    manager.add(window);

    LayoutEngine.Measure(manager.root, manager.root.contentLayout());
    Renderer.Create().build(manager.root, cnv);

    expect(
      cnv
        .getCell(layout.width - 1, layout.height - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_BLUE_BACKGROUND);

    const yellowWindow = new EditorWindow();
    yellowWindow.window
      .styles()
      ?.setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);

    manager.split(window, yellowWindow, "horizontal");

    LayoutEngine.Measure(manager.root, manager.root.contentLayout());
    Renderer.Create().build(manager.root, cnv);

    expect(root.children().length == 1, "did not replace correctly");
    expect(
      cnv
        .getCell(layout.width / 2 - 1, layout.height - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_BLUE_BACKGROUND);
    expect(
      cnv
        .getCell(layout.width - 1, layout.height - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_YELLOW_BACKGROUND);
  });
  it("can split a window in vertical form", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.width = layout.height = 20;
    const cnv = new Canvas().setLayout(layout);
    const root = new EditorRoot().setLayout(layout);

    const manager = new WindowManager(root);

    const window = new EditorWindow();
    window.window.styles()?.setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND);

    root.addChildren(window.window);
    manager.add(window);

    LayoutEngine.Measure(manager.root, manager.root.contentLayout());
    Renderer.Create().build(manager.root, cnv);

    expect(
      cnv
        .getCell(layout.width - 1, layout.height - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_BLUE_BACKGROUND);

    const yellowWindow = new EditorWindow();
    yellowWindow.window
      .styles()
      ?.setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);

    manager.split(window, yellowWindow, "vertical");

    LayoutEngine.Measure(manager.root, manager.root.contentLayout());
    Renderer.Create().build(manager.root, cnv);

    expect(root.children().length == 1, "did not replace correctly");
    expect(
      cnv
        .getCell(layout.width - 1, layout.height / 2 - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_BLUE_BACKGROUND);
    expect(
      cnv
        .getCell(layout.width - 1, layout.height - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_YELLOW_BACKGROUND);

    cnv.renderBoard();
  });
});
