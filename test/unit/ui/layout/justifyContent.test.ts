import { describe, expect, it } from "vitest";
import { LayoutEngine } from "../../../../src/ui/layout/layout";
import { DisplayComponent } from "../../../../src/ui/components/components";
import colors from "../../../../src/ui/colors";
import { Canvas } from "../../../../src/ui/canvas";
import { Renderer } from "../../../../src/ui/renderer";

describe("justify content tests", () => {
  it("puts the element on the center", () => {
    const layout = LayoutEngine.CreateBounds(30, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setJustifyContent("center");
    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const center = new DisplayComponent().setWidth(6).setHeight(6);

    center.styles().setBackgroundColor(colors.RED_BACKGROUND);

    root.addChildren(center);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    expect(center.layout().x).eq(layout.width / 2 - center.layout().width / 2);
  });
  it("more than one element on the center", () => {
    const layout = LayoutEngine.CreateBounds(30, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setJustifyContent("center");
    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const left = new DisplayComponent().setWidth(6).setHeight(6);
    left.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const right = new DisplayComponent().setWidth(6).setHeight(6);
    right.styles().setBackgroundColor(colors.CYAN_BACKGROUND);

    root.addChildren([left, right]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    expect(left.layout().x + left.layout().width).eq(
      Math.round(layout.width / 2),
    );
  });

  it("starts at the end", () => {
    const layout = LayoutEngine.CreateBounds(30, 10);
    const canvas = new Canvas().setLayout(layout);

    const parent = new DisplayComponent().setLayout(layout);

    const root = new DisplayComponent()
      .setDirection("horizontal")
      .setJustifyContent("end");

    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const left = new DisplayComponent().setWidth(6).setHeight(6);
    left.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const right = new DisplayComponent().setWidth(6).setHeight(6);
    right.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.addChildren(left);
    root.addChildren(right);

    parent.addChildren(root);

    LayoutEngine.Measure(parent, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(parent);
    Renderer.Create().build(parent, canvas);

    canvas.renderBoard();
    expect(left.layout().x).eq(
      layout.width - (left.layout().width + right.layout().width),
    );
  });
  it("spaces evenly", () => {
    const layout = LayoutEngine.CreateBounds(30, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setJustifyContent("space-evenly");

    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const left = new DisplayComponent().setWidth(6).setHeight(6);

    left.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const middle = new DisplayComponent().setWidth(6).setHeight(6);
    middle.styles().setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

    const right = new DisplayComponent().setWidth(6).setHeight(6);
    right.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.addChildren(left);
    root.addChildren(middle);
    root.addChildren(right);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    const rowWidth =
      left.layout().width + middle.layout().width + right.layout().width;

    const available = layout.width - rowWidth;

    const spacing = Math.round(available / 4);

    expect(left.layout().x, "starts at the initial position").eq(spacing);

    expect(middle.layout().x).eq(
      left.layout().x + spacing + left.layout().width,
    );
    expect(right.layout().x).eq(
      left.layout().x + spacing + middle.layout().x + spacing,
    );
    expect(layout.width).eq(
      spacing +
        left.layout().width +
        spacing +
        middle.layout().width +
        spacing +
        right.layout().width +
        spacing,
    );

    canvas.renderBoard();
  });
  it("spaces between", () => {
    const layout = LayoutEngine.CreateBounds(30, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setJustifyContent("space-between");

    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const left = new DisplayComponent().setWidth(6).setHeight(6);

    left.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const middle = new DisplayComponent().setWidth(6).setHeight(6);
    middle.styles().setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

    const right = new DisplayComponent().setWidth(6).setHeight(6);
    right.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.addChildren(left);
    root.addChildren(middle);
    root.addChildren(right);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    const rowWidth =
      left.layout().width + middle.layout().width + right.layout().width;

    const available = layout.width - rowWidth;
    const spacing = available / 2;

    expect(left.layout().x).eq(0);
    expect(middle.layout().x).eq(
      left.layout().x + left.layout().width + spacing,
    );
    expect(right.layout().x).eq(
      left.layout().x +
        left.layout().width +
        spacing +
        middle.layout().width +
        spacing,
    );
    expect(right.layout().x + right.layout().width).eq(layout.width);

    canvas.renderBoard();
  });

  it("spaces around", () => {
    const layout = LayoutEngine.CreateBounds(40, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setJustifyContent("space-around");

    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const left = new DisplayComponent().setWidth(6).setHeight(6);

    left.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const middle = new DisplayComponent().setWidth(6).setHeight(6);
    middle.styles().setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

    const right = new DisplayComponent().setWidth(6).setHeight(6);
    right.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.addChildren([left, middle, right]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);
    canvas.renderBoard();

    const rowWidth =
      left.layout().width + middle.layout().width + right.layout().width;

    const available = layout.width - rowWidth;

    const spacing = Math.round(available / 3);

    const startX = Math.round(spacing / 2);

    expect(left.layout().x).eq(startX);
    expect(middle.layout().x).eq(left.layout().width + spacing + startX);
    expect(right.layout().x).eq(
      left.width() + spacing + startX + spacing + middle.width(),
    );
    expect(layout.width - (right.layout().x + right.layout().width)).eq(startX);
  });
  it("align content start", () => {
    const layout = LayoutEngine.CreateBounds(40, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setAlignContent("start")
      .setJustifyContent("center");

    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const left = new DisplayComponent().setWidth(6).setHeight(6);

    left.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const middle = new DisplayComponent().setWidth(6).setHeight(6);
    middle.styles().setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

    const right = new DisplayComponent().setWidth(6).setHeight(6);
    right.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.addChildren([left, middle, right]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);
    canvas.renderBoard();

    expect(left.layout().y).eq(0);
  });

  it("align content center", () => {
    const layout = LayoutEngine.CreateBounds(40, 20);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setAlignContent("center")
      .setJustifyContent("center");

    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);

    const { left, middle, right } = setup();

    root.addChildren([left, middle, right]);

    build(root, canvas);

    const middleBoard = Math.round(layout.height / 2);

    const middleFlag = left.layout().y + Math.floor(left.layout().height / 2);

    expect(middleFlag).eq(middleBoard);
  });
  it("align content end", () => {
    const layout = LayoutEngine.CreateBounds(40, 20);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setAlignContent("end")
      .setJustifyContent("center");

    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);

    const { left, middle, right } = setup();

    root.addChildren([left, middle, right]);

    build(root, canvas);

    expect(left.layout().y + left.layout().height).eq(layout.height);
  });
});

function build(root: DisplayComponent, canvas: Canvas) {
  LayoutEngine.Measure(
    root,
    LayoutEngine.CreateConstraints(root.layout().width),
  );
  LayoutEngine.Arrange(root);
  Renderer.Create().build(root, canvas);
  canvas.renderBoard();
}

function setup() {
  const left = new DisplayComponent().setWidth(6).setHeight(6);

  left.styles().setBackgroundColor(colors.RED_BACKGROUND);

  const middle = new DisplayComponent().setWidth(6).setHeight(6);
  middle.styles().setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

  const right = new DisplayComponent().setWidth(6).setHeight(6);

  right.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

  return {
    left,
    middle,
    right,
  };
}
