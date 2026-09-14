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

    expect(bottom.layout().y + bottom.layout().height).eq(layout.height);
  });
  it("center", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent()
      .setLayout(layout)
      .setAlignContent("center");
    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const top = new DisplayComponent().setWidth(5).setHeight(5);
    top.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
    const middle = new DisplayComponent().setWidth(5).setHeight(5);
    middle.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const bottom = new DisplayComponent().setWidth(5).setHeight(5);
    bottom.styles().setBackgroundColor(colors.BRIGHT_MAGENTA_BACKGROUND);

    root.addChildren([top, middle, bottom]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);
    canvas.renderBoard();

    const totalHeight =
      bottom.layout().height + middle.layout().height + top.layout().height;

    const diff = Math.round((layout.height - totalHeight) / 2);

    expect(top.layout().y).eq(diff);
  });
  it("space-between", () => {
    const layout = LayoutEngine.CreateBounds(20, 21);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent()
      .setLayout(layout)
      .setAlignContent("space-between");
    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const top = new DisplayComponent().setWidth(5).setHeight(5);
    top.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
    const middle = new DisplayComponent().setWidth(5).setHeight(5);
    middle.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const bottom = new DisplayComponent().setWidth(5).setHeight(5);
    bottom.styles().setBackgroundColor(colors.BRIGHT_MAGENTA_BACKGROUND);

    root.addChildren([top, middle, bottom]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    const tl = top.layout();
    const ml = middle.layout();
    const bl = bottom.layout();

    const available = Math.round(
      layout.height -
        top.layout().height -
        middle.layout().height -
        bottom.layout().height,
    );

    const spacing = Math.round(available / 2);

    expect(tl.y).eq(0);
    expect(tl.height + spacing).eq(ml.y);
    expect(bl.y + bl.height).eq(layout.height);
  });

  it("space-evenly", () => {
    const layout = LayoutEngine.CreateBounds(20, 21);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent()
      .setLayout(layout)
      .setAlignContent("space-evenly");
    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const top = new DisplayComponent().setWidth(3).setHeight(3);
    top.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
    const middle = new DisplayComponent().setWidth(3).setHeight(3);
    middle.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const bottom = new DisplayComponent().setWidth(3).setHeight(3);
    bottom.styles().setBackgroundColor(colors.BRIGHT_MAGENTA_BACKGROUND);

    root.addChildren([top, middle, bottom]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    const height =
      top.layout().height + middle.layout().height + bottom.layout().height;

    const spacing = Math.round(layout.height - height) / 4;

    expect(spacing + top.layout().height + spacing).eq(middle.layout().y);
    expect(
      spacing +
        top.layout().height +
        spacing +
        middle.layout().height +
        spacing,
    ).eq(bottom.layout().y);
    expect(
      spacing +
        top.layout().height +
        spacing +
        middle.layout().height +
        spacing +
        bottom.layout().height +
        spacing,
    ).eq(layout.height);
  });
  it.todo("space-around");

  it.todo("justify content start");
  it.todo("justify content end");
  it.todo("justify content center");
});
