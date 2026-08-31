import { describe, it, expect } from "vitest";
import { Canvas } from "../../../ui/canvas.js";
import colors from "../../../ui/colors.js";
import { DisplayComponent } from "../../../ui/components.js";
import { LayoutEngine } from "../../../ui/layout/layout.js";
import { Renderer } from "../../../ui/renderer.js";
import { EditorRoot } from "../../Editor/EditorRoot.js";
import { WindowManager } from "./WindowManager.js";
import { TextEditorWindow } from "../TextEditorWindow.js";
import { Textdocument, MemoryFile } from '../../Documents/TextDocument.js';

const createTextWindow = (text: string) =>
  new TextEditorWindow(new Textdocument(new MemoryFile("out", text)));

const createCubes = (manager: WindowManager) => {
  const topL = createTextWindow("top left");
  topL.window.styles()?.setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);
  const topR = createTextWindow("top right");
  topR.window.styles()?.setBackgroundColor(colors.MAGENTA_BACKGROUND);

  const bottomL = createTextWindow("bottom left");
  bottomL.window.styles()?.setBackgroundColor(colors.WHITE_BACKGROUND);
  const bottomR = createTextWindow("bottom right");
  bottomR.window.styles()?.setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

  manager.add(topL).add(topR).add(bottomL).add(bottomR);
  manager.root.addChildren(
    new DisplayComponent()
      .setDirection("horizontal")
      .addChildren(topL.window)
      .addChildren(topR.window),
  );
  manager.root.addChildren(
    new DisplayComponent()
      .setDirection("horizontal")
      .addChildren(bottomL.window)
      .addChildren(bottomR.window),
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
    const layout = LayoutEngine.CreateBounds();
    layout.width = layout.height = 20;
    const cnv = new Canvas().setLayout(layout);
    const manager = new WindowManager(new EditorRoot().setLayout(layout));

    const output = createCubes(manager);

    manager.focus(output.topL);

    LayoutEngine.Measure(manager.root);
    Renderer.Create().build(manager.root, cnv);

    manager.focusRight();
    expect(output.topR.focused()).eq(true);
  });
});
