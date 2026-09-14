import { describe, expect, it } from "vitest";
import { LayoutEngine } from "../../../../src/ui/layout/layout";
import { Canvas } from "../../../../src/ui/canvas";
import { DisplayComponent } from "../../../../src/ui/components/components";
import colors from "../../../../src/ui/colors";
import { Renderer } from "../../../../src/ui/renderer";

describe("align content tests", () => {
  it("start", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent()
      .setLayout(layout)
      .setAlignContent("start");
    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const top = new DisplayComponent().setWidth(5).setHeight(5);
    top.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
    const middle = new DisplayComponent().setWidth(5).setHeight(5);
    middle.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const bottom = new DisplayComponent().setWidth(5).setHeight(5);
    bottom.styles().setBackgroundColor(colors.BRIGHT_MAGENTA_BACKGROUND);

    root.addChildren(top);
    root.addChildren(middle);
    root.addChildren(bottom);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);
    canvas.renderBoard();

    expect(top.layout().y).eq(0);
    expect(bottom.layout().y).eq(top.layout().height + middle.height());
  });
  it("end", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent()
      .setLayout(layout)
      .setAlignContent("end");
    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const top = new DisplayComponent().setWidth(5).setHeight(5);
    top.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
    const middle = new DisplayComponent().setWidth(5).setHeight(5);
    middle.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const bottom = new DisplayComponent().setWidth(5).setHeight(5);
    bottom.styles().setBackgroundColor(colors.BRIGHT_MAGENTA_BACKGROUND);

    root.addChildren(top);
    root.addChildren(middle);
    root.addChildren(bottom);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);
    canvas.renderBoard();

    expect(bottom.layout().y).eq(layout.height);
  });
  it.todo("center");
  it.todo("space-between");
  it.todo("space-evenly");
  it.todo("space-around");

  it.todo('justify content start')
  it.todo('justify content end')
  it.todo('justify content center')
});
