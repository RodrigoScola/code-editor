import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../components.js";
import { LayoutEngine } from "./layout.js";
import { Renderer } from "../renderer.js";
import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { assert } from "../../assert.js";
import { ComponentStyle } from "../ComponentStyles.js";

describe("tests the layout calculation on absolute", () => {
  it("doesnt need layout property if height and width is set", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 30;

    const root = new DisplayComponent()
      .setLayout(layout)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.BLUE_BACKGROUND),
      )
      .setDirection("vertical");
    const canvas = new Canvas().setLayout(layout);

    const oneThird = new DisplayComponent()
      .setHeight("30%")
      .setWidth("30%")
      .setIndex(1)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(
          colors.BRIGHT_YELLOW_BACKGROUND,
        ),
      )

      .setPositionMode("absolute");

    root.addChildren(oneThird);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.Create().build(root, canvas);

    expect(oneThird.layout().height).eq(layout.height * 0.3);
    expect(oneThird.layout().width).eq(layout.width * 0.3);

    canvas.renderBoard();
  });
  it.todo("tests the start  x and y");
});
