import { describe, it, expect, assert } from "vitest";
import {
  Textdocument,
  MemoryFile,
} from "../../../../../src/Editor/Documents/TextDocument.js";

import { Canvas } from "../../../../../src/ui/canvas.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../../src/ui/renderer.js";
import colors from "../../../../../src/ui/colors.js";
import { WindowManager } from "../../../../../src/Editor/windows/WindowManager/WindowManager.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import {
  UiComponent,
  UIScreen,
} from "../../../../../src/ui/components/UiComponent.js";
import { isTextComponent } from "../../../../../src/utils.js";
import { FileTreeWindow } from "../../../../../src/Editor/windows/FileTreeWindow.js";

describe("tests the window manager split capabilities", () => {
  it("focus the correct window at the correct time", () => {
    const manager = new WindowManager(new EditorRoot());
    const content = "one\ntwo\nthree\n";
    const editor = new UIScreen().setText(content);

    const tree = new FileTreeWindow(".");

    manager.root.addChildren(editor).addChildren(tree);
    manager.add(editor).add(tree);

    manager.activate(editor);

    expect(manager.activeWindow()).toBe(editor);
    expect(manager.activeWindow()).not.toBe(tree);
    manager.activate(tree);

    expect(manager.activeWindow()).not.toBe(editor);
    expect(manager.activeWindow()).toBe(tree);
    const other = new UIScreen().setText("one\ntwo\nthree\n");

    manager.split(manager.activeWindow()!, other, "vertical");

    LayoutEngine.Measure(manager.root, LayoutEngine.CreateConstraints(20));
    Renderer.Create().build(
      manager.root,
      new Canvas().setLayout({ x: 0, y: 0, height: 20, width: 20 }),
    );

    expect(manager.activeWindow()).toBe(tree);
    expect(manager.root.children().at(0)).toBe(editor);
    expect(manager.root.children().at(1)?.children().length == 2).eq(true);
  });
  it("can split more than once", () => {
    const manager = new WindowManager(new EditorRoot());

    const editor = new UIScreen().setText("one\ntwo\nthree\n");

    editor.view().styles()?.setBackgroundColor(colors.YELLOW_BACKGROUND);

    const tree = new FileTreeWindow(".");
    tree.view().styles()?.setBackgroundColor(colors.BLUE_BACKGROUND);
    const layout = LayoutEngine.CreateBounds(20);
    const constraints = LayoutEngine.CreateConstraints(layout.width);

    manager.root
      .setLayout(layout)
      .addChildren(editor)
      .addChildren(tree);
    manager.add(editor).add(tree);
    manager.activate(editor);

    const cnv = new Canvas().setLayout(layout);

    manager.activate(tree);

    const other = new UIScreen().setText("four\nfive\nsix");

    other.view().styles()?.setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);
    manager.split(manager.activeWindow()!, other, "horizontal");

    expect(manager.activeWindow()?.view().getId()).eq(tree.view().getId());
    expect(manager.root.children().at(0)).toBe(editor);
    expect(manager.root.children().at(1)?.children().length == 2).eq(true);

    const other2 = new UIScreen().setText("seven\neight\nnine");

    other2.view().styles()?.setBackgroundColor(colors.BRIGHT_RED_BACKGROUND);

    manager.split(other, other2, "vertical");

    LayoutEngine.Measure(manager.root, constraints).Arrange(manager.root);

    Renderer.Create().build(manager.root, cnv);

    cnv.renderBoard();

    expect(manager.root.children().at(1)?.children().length == 2).eq(true);
    expect(
      manager.root.children().at(1)?.children().at(0)?.children().length == 2,
    );
  });
  it("can split a window in horizontal form", () => {
    const layout = LayoutEngine.CreateBounds(20);
    const constraints = LayoutEngine.CreateConstraints(20);
    const cnv = new Canvas().setLayout(layout);
    const root = new EditorRoot().setLayout(layout);

    const manager = new WindowManager(root);

    const window = new UiComponent();
    window.view().styles()?.setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND);

    root.addChildren(window);
    manager.add(window);

    LayoutEngine.Measure(manager.root, constraints).Arrange(root);

    Renderer.Create().build(manager.root, cnv);

    expect(
      cnv
        .getCell(layout.width - 1, layout.height - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_BLUE_BACKGROUND);

    cnv.renderBoard();

    const yellowWindow = new UiComponent();
    yellowWindow
      .view()
      .styles()
      ?.setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);

    manager.split(window, yellowWindow, "horizontal");

    LayoutEngine.Measure(manager.root, constraints).Arrange(root);
    Renderer.Create().build(manager.root, cnv);

    cnv.renderBoard();

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
    const layout = LayoutEngine.CreateBounds(20);
    const constraints = LayoutEngine.CreateConstraints(20);
    const cnv = new Canvas().setLayout(layout);
    const root = new EditorRoot().setLayout(layout);

    const manager = new WindowManager(root);

    const window = new UiComponent();
    window.view().styles()?.setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND);

    root.addChildren(window);
    manager.add(window);

    LayoutEngine.Measure(manager.root, constraints);
    LayoutEngine.Arrange(manager.root);
    Renderer.Create().build(manager.root, cnv);

    expect(
      cnv
        .getCell(layout.width - 1, layout.height - 1)
        ?.styles.backgroundColor(),
    ).eq(colors.BRIGHT_BLUE_BACKGROUND);

    const yellowWindow = new UiComponent();
    yellowWindow
      .view()
      .styles()
      ?.setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);

    manager.split(window, yellowWindow, "vertical");

    LayoutEngine.Measure(manager.root, constraints);
    LayoutEngine.Arrange(root);

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
