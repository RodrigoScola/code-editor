import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../components/components.js";
import { LayoutEngine } from "./layout.js";
import { Renderer } from "../renderer.js";
import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";

describe("tests the layout calculation on absolute", () => {
  it("doesnt need layout property if height and width is set", () => {
    const layout = LayoutEngine.CreateBounds(30);

    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.BLUE_BACKGROUND),
      )
      .setDirection("vertical");

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

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    expect(oneThird.layout().height).eq(layout.height * 0.3);
    expect(oneThird.layout().width).eq(layout.width * 0.3);

    canvas.renderBoard();
  });
  it("tests the start  x and y", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

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
      .setStartX(3)
      .setStartY(3)
      .setIndex(1)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(
          colors.BRIGHT_YELLOW_BACKGROUND,
        ),
      )
      .setPositionMode("absolute");

    root.addChildren(oneThird);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    expect(oneThird.layout().height).eq(layout.height * 0.3);
    expect(oneThird.layout().x).eq(3);
    expect(oneThird.layout().y).eq(3);
    expect(oneThird.layout().width).eq(layout.width * 0.3);

    canvas.renderBoard();
  });
});

describe("on the new layout sizing children", () => {
  it("when a child has a set height and width ,the parent height and width should not be 0", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const root = new DisplayComponent()
      .setLayout(layout)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.BLUE_BACKGROUND),
      )
      .setDirection("vertical");
    const canvas = new Canvas().setLayout(layout);

    const parent = new DisplayComponent();

    const child = new DisplayComponent().setHeight(4).setWidth(4);

    root.addChildren(parent.addChildren(child));

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    const clt = child.contentLayout();
    expect(clt.height).eq(4);
    expect(clt.width).eq(4);
    expect(parent.contentLayout().height).greaterThanOrEqual(4);
    expect(parent.contentLayout().width).greaterThanOrEqual(4);

    canvas.renderBoard();
  });
});
