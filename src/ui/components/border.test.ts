import { describe, expect, it } from "vitest";
import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { LayoutEngine } from "../layout/layout.js";
import { Renderer } from "../renderer.js";
import { DisplayComponent } from "./components.js";
import { ComponentBorder } from "./border.js";

describe("tests the component border", () => {
  it("border is in calculation of layout", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 20;

    const border = new ComponentBorder().setParameter(1);
    border.styles().setColor(colors.BLACK_FOREGROUND);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal");

    const left = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
    );

    const right = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.BLUE_BACKGROUND),
    );
    right.border().setLeft(1).setRight(1);
    root.addChildren(left);
    root.addChildren(right);

    const canvas = new Canvas().setLayout(layout);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);
    expect(canvas.getCell(9, 0)?.styles.backgroundColor()).eq(
      colors.RED_BACKGROUND,
    );

    // expect(canvas.getCell(10, 0)?.styles.backgroundColor()).eq(
    //   colors.BLUE_BACKGROUND,
    // );

    canvas.renderBoard();
  });
  it("displays the border", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const border = new ComponentBorder().setParameter(1);
    border.styles().setColor(colors.BLACK_FOREGROUND);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.BLUE_BACKGROUND),
      )
      .setDirection("vertical")
      .setBorder(border);

    const canvas = new Canvas().setLayout(layout);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(10)).Arrange(
      root,
    );
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });
});
