import { describe, it, expect } from "vitest";
import { Canvas } from "../../../../../src/ui/canvas.js";
import colors from "../../../../../src/ui/colors.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../../src/ui/renderer.js";
import {
  Textdocument,
  MemoryFile,
} from "../../../../../src/Editor/Documents/TextDocument.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import {
  UiComponent,
  UIScreen,
} from "../../../../../src/ui/components/UiComponent.js";
import { WindowManager } from "../../../../../src/Editor/windows/WindowManager/WindowManager.js";

const createTextWindow = (text: string) => new UIScreen().setText(text);

const createCubes = (manager: WindowManager) => {
  const topL = createTextWindow("top left");
  topL.view().styles()?.setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);
  const topR = createTextWindow("top right");
  topR.view().styles()?.setBackgroundColor(colors.MAGENTA_BACKGROUND);

  const bottomL = createTextWindow("bottom left");
  bottomL.view().styles()?.setBackgroundColor(colors.WHITE_BACKGROUND);
  const bottomR = createTextWindow("bottom right");
  bottomR.view().styles()?.setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

  manager.add(topL).add(topR).add(bottomL).add(bottomR);
  const topRow = new UiComponent().addChildren(topL).addChildren(topR);
  topRow.view().setDirection("horizontal");
  manager.root.addChildren(topRow);
  const bottomRow = new UiComponent().addChildren(bottomL).addChildren(bottomR);
  bottomRow.view().setDirection("horizontal");
  manager.root.addChildren(bottomRow);

  return {
    topR,
    topL,
    bottomL,
    bottomR,
  };
};

describe("tests the window manager focus capabilities", () => {
  it("can focus on the left window on focus right", () => {
    const layout = LayoutEngine.CreateBounds(20);
    const cnv = new Canvas().setLayout(layout);
    const manager = new WindowManager(new EditorRoot().setLayout(layout));

    const output = createCubes(manager);

    manager.activate(output.topL);

    LayoutEngine.Measure(
      manager.root,
      LayoutEngine.CreateConstraints(layout.height),
    );
    LayoutEngine.Arrange(manager.root);
    Renderer.Create().build(manager.root, cnv);

    manager.activateRight();
    expect(manager.activeWindow()).toBe(output.topR);
  });
  it("can focus on the bottom window on focus down", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.width = layout.height = 20;
    const cnv = new Canvas().setLayout(layout);
    const manager = new WindowManager(new EditorRoot().setLayout(layout));

    const output = createCubes(manager);

    manager.activate(output.topL);

    LayoutEngine.Measure(
      manager.root,
      LayoutEngine.CreateConstraints(layout.width),
    );
    LayoutEngine.Arrange(manager.root);
    Renderer.Create().build(manager.root, cnv);

    manager.activateDown();
    expect(manager.activeWindow()).toBe(output.bottomL);
  });
  it("can focus on the bottom and right window on focus down", () => {
    const layout = LayoutEngine.CreateBounds(20);
    const cnv = new Canvas().setLayout(layout);
    const manager = new WindowManager(new EditorRoot().setLayout(layout));

    const output = createCubes(manager);

    manager.activate(output.topL);

    LayoutEngine.Measure(
      manager.root,
      LayoutEngine.CreateConstraints(layout.width),
    );
    LayoutEngine.Arrange(manager.root);

    Renderer.Create().build(manager.root, cnv);

    manager.activateDown();
    manager.activateRight();
    expect(manager.activeWindow()).toBe(output.bottomR);
  });
});
