import { describe, it, expect } from "vitest";
import { Canvas } from "../../../../../src/ui/canvas.js";
import colors from "../../../../../src/ui/colors.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../../src/ui/renderer.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import { WindowManager } from "../../../../../src/Editor/windows/WindowManager/WindowManager.js";
import {
  Textdocument,
  MemoryFile,
} from "../../../../../src/Editor/Documents/TextDocument.js";
import { DisplayComponent } from "../../../../../src/ui/components/displayComponent.js";
import { UiComponent } from "../../../../../src/ui/components/UiComponent.js";

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
  manager.root.addChildren(
    new DisplayComponent()
      .setDirection("horizontal")
      .addChildren(topL.view())
      .addChildren(topR.view()),
  );
  manager.root.addChildren(
    new DisplayComponent()
      .setDirection("horizontal")
      .addChildren(bottomL.view())
      .addChildren(bottomR.view()),
  );

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
    Renderer.Create().build(manager.root, cnv);

    manager.activateRight();
    expect(output.topR.isFocused()).eq(true);
  });
});
