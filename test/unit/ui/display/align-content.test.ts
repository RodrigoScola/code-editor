import { describe, expect, it } from "vitest";
import { LayoutEngine } from "../../../../src/ui/layout/layout";
import { Canvas } from "../../../../src/ui/canvas";
import { DisplayComponent } from "../../../../src/ui/components/components";
import colors from "../../../../src/ui/colors";
import { Renderer } from "../../../../src/ui/renderer";
import { LayoutBounds } from "../../../../src/ui/layout/layoutStyle";

const createRoot = (layout: LayoutBounds) => {
  const cm = new DisplayComponent();

  cm.setLayout(layout);

  cm.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

  return cm;
};

describe("align content tests", () => {
  it("start", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);
    const root = createRoot(layout).setAlignContent("start");

    const { top, bottom, middle } = setup(root);

    build(root, canvas);

    expect(top.layout().y).eq(0);
    expect(bottom.layout().y).eq(top.layout().height + middle.height());
  });
  it("end", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);

    const root = createRoot(layout).setAlignContent("end");
    const { top, bottom, middle } = setup(root);

    build(root, canvas);

    expect(bottom.layout().y + bottom.layout().height).eq(layout.height);
  });
  it("center", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);
    const root = createRoot(layout).setAlignContent("center");

    const { top, bottom, middle } = setup(root);

    build(root, canvas);

    const totalHeight =
      bottom.layout().height + middle.layout().height + top.layout().height;

    const diff = Math.round((layout.height - totalHeight) / 2);

    expect(top.layout().y).eq(diff);
  });
  it("space-between", () => {
    const layout = LayoutEngine.CreateBounds(20, 21);
    const canvas = new Canvas().setLayout(layout);
    const root = createRoot(layout).setAlignContent("space-between");

    const { top, bottom, middle } = setup(root);

    build(root, canvas);

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

    const root = createRoot(layout).setAlignContent("space-evenly");

    const { top, bottom, middle } = setup(root);

    build(root, canvas);

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
  it("space-around", () => {
    const layout = LayoutEngine.CreateBounds(20, 23);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent()
      .setLayout(layout)
      .setAlignContent("space-around");
    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const { top, middle, bottom } = setup(root);

    build(root, canvas);

    const height =
      top.layout().height + middle.layout().height + bottom.layout().height;

    const available = Math.round(layout.height - height);
    const spacing = Math.round(available / 3);

    const halfSpacing = Math.floor(spacing / 2);

    expect(
      halfSpacing +
        top.layout().height +
        spacing +
        middle.layout().height +
        spacing +
        bottom.layout().height +
        halfSpacing,
    ).eq(layout.height);

    canvas.renderBoard();
  });

  it("justify content end", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);

    const root = createRoot(layout).setJustifyContent("end");

    const { bottom, top, middle } = setup(root);

    build(root, canvas);

    expect(top.layout().x).eq(layout.width - top.layout().width);
    expect(middle.layout().x).eq(layout.width - middle.layout().width);
    expect(bottom.layout().x).eq(layout.width - bottom.layout().width);
  });
  it("justify content center", () => {
    const layout = LayoutEngine.CreateBounds(20, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent().setLayout(layout);

    const parent = new DisplayComponent().setJustifyContent("center");

    root.addChildren(parent);
    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const { bottom, top, middle } = setup(parent);

    build(root, canvas);

    const x =
      Math.floor(layout.width / 2) - Math.round(middle.layout().width / 2);

    expect(top.layout().x).eq(x);
    expect(middle.layout().x).eq(x);
    expect(bottom.layout().x).eq(x);
  });
});
describe("justify content start", () => {
  it("starts on original position", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent().setLayout(layout);

    const parent = new DisplayComponent();

    root.addChildren(parent);

    root.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const { top, middle, bottom } = setup(parent);

    build(root, canvas);

    expect(top.layout().x).eq(0);
    expect(middle.layout().x).eq(0);
    expect(bottom.layout().x).eq(0);
  });
  it("is dynamic", () => {
    const layout = LayoutEngine.CreateBounds(20, 20);
    const canvas = new Canvas().setLayout(layout);
    const root = new DisplayComponent().setLayout(layout);

    const parent = new DisplayComponent();

    root.addChildren(parent);

    const { top, middle, bottom } = setup(parent);

    build(root, canvas);

    expect(top.layout().x).eq(0);
    expect(middle.layout().x).eq(0);
    expect(bottom.layout().x).eq(0);

    parent.setPaddingLeft(3);

    build(root, canvas);

    expect(top.layout().x).eq(3);
    expect(middle.layout().x).eq(3);
    expect(bottom.layout().x).eq(3);
  });
});

function setup(root: DisplayComponent) {
  const top = new DisplayComponent().setWidth(3).setHeight(3);
  top.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
  const middle = new DisplayComponent().setWidth(3).setHeight(3);
  middle.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
  const bottom = new DisplayComponent().setWidth(3).setHeight(3);
  bottom.styles().setBackgroundColor(colors.BRIGHT_MAGENTA_BACKGROUND);

  root.addChildren([top, middle, bottom]);
  return { top, middle, bottom };
}

function build(root: DisplayComponent, canvas: Canvas) {
  LayoutEngine.Measure(
    root,
    LayoutEngine.CreateConstraints(root.layout().width),
  );
  LayoutEngine.Arrange(root);
  Renderer.Create().build(root, canvas);

  canvas.renderBoard();
}
