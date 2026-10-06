import { describe, it, expect } from "vitest";
import { Canvas } from "../../../../../src/ui/canvas.js";
import colors from "../../../../../src/ui/colors.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../../src/ui/renderer.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import { WindowManager } from "../../../../../src/Editor/windows/WindowManager/WindowManager.js";
import { DisplayComponent } from "../../../../../src/ui/components/displayComponent.js";
import {
  UIScreen,
  UiComponent,
} from "../../../../../src/ui/components/UiComponent.js";

const createTextWindow = (text: string) => new UiComponent().setText(text);

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

  const canvas = new UIScreen();
  canvas
    .view()
    .setDirection("horizontal")
    .addChildren(topL.view())
    .addChildren(topR.view());

  const other = new UIScreen();
  other
    .view()
    .setDirection("horizontal")
    .addChildren(bottomL.view())
    .addChildren(bottomR.view());

  manager.root.addChildren(canvas).addChildren(other);

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
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(manager.root);
    Renderer.Create(cnv).build(manager.root);

    cnv.renderBoard();

    manager.activateRight();
    // expect(output.topR.isFocused()).eq(true);
  });
});
