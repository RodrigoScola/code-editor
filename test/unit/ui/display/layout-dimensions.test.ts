import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/components.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import { Canvas } from "../../../../src/ui/canvas.js";
import colors from "../../../../src/ui/colors.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";

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

describe("wrap children", () => {
  it("when wraps horizontal, should start a new line", () => {
    const layout = LayoutEngine.CreateBounds(30, 20);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setWrap("wrap")
      .setName("wrap")
      .setDirection("horizontal");

    root.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const first = new DisplayComponent().setWidth(10);
    first.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const second = new DisplayComponent().setWidth(10);
    second.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    const third = new DisplayComponent().setName("third");

    const children = new DisplayComponent().setWidth(10).setName("child");
    children.styles().setBackgroundColor(colors.DARK_GRAY_BACKGROUND);
    third.addChildren(children);

    third.styles().setBackgroundColor(colors.BRIGHT_GREEN_BACKGROUND);

    const fourth = new DisplayComponent().setWidth(10);
    fourth.styles().setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);
    fourth.setName("fourth");

    root.addChildren([first, second, third, fourth]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    expect(first.layout().x).toBe(0);
    expect(first.layout().height).toBe(layout.height / 2);
    expect(second.layout().x).toBe(10);
    expect(third.layout().x).toBe(20);
    expect(fourth.layout().x).toBe(0);
    expect(fourth.layout().y).toBeGreaterThan(third.layout().y);
  });
  it("when wraps reverse horizontal, fourth should be first", () => {
    const layout = LayoutEngine.CreateBounds(30, 20);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setWrap("wrap-reverse")
      .setDirection("horizontal");
    root.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const first = new DisplayComponent().setWidth(10);
    first.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const second = new DisplayComponent().setWidth(10);
    second.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    const third = new DisplayComponent().setName("third");

    const children = new DisplayComponent().setWidth(10).setName("child");
    children.styles().setBackgroundColor(colors.DARK_GRAY_BACKGROUND);
    third.addChildren(children);

    third.styles().setBackgroundColor(colors.BRIGHT_GREEN_BACKGROUND);

    const fourth = new DisplayComponent().setWidth(10);
    fourth.styles().setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);

    root.addChildren(first);
    root.addChildren(second);
    root.addChildren(third);
    root.addChildren(fourth);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    expect(third.layout().y).toBeGreaterThan(fourth.layout().y);
  });
  it("when wraps vertical, should start a new line", () => {
    const layout = LayoutEngine.CreateBounds(20, 40);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setWrap("wrap")
      .setGap(1);

    root.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const first = new DisplayComponent().setHeight(10);
    first.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const second = new DisplayComponent().setHeight(10);
    second.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    const third = new DisplayComponent().setName("third").setHeight(10);

    const children = new DisplayComponent().setHeight(10).setName("child");
    children.styles().setBackgroundColor(colors.DARK_GRAY_BACKGROUND);
    third.addChildren(children);

    third.styles().setBackgroundColor(colors.BRIGHT_GREEN_BACKGROUND);

    const fourth = new DisplayComponent().setHeight(10);
    fourth.styles().setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

    root.addChildren([first, second, third, fourth]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    expect(first.layout().height).eq(10);
    expect(first.layout().x).eq(third.layout().x);
    expect(fourth.layout().x).toBeGreaterThan(first.layout().x);
  });
  it("when wraps reverse vertical, fourth should be first", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setWrap("wrap-reverse");
    root.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const first = new DisplayComponent().setHeight(10);
    first.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    const second = new DisplayComponent().setHeight(10);
    second.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    const third = new DisplayComponent().setName("third");

    const children = new DisplayComponent().setHeight(10).setName("child");
    children.styles().setBackgroundColor(colors.DARK_GRAY_BACKGROUND);
    third.addChildren(children);

    third.styles().setBackgroundColor(colors.BRIGHT_GREEN_BACKGROUND);

    const fourth = new DisplayComponent().setHeight(10);
    fourth.styles().setBackgroundColor(colors.BRIGHT_YELLOW_BACKGROUND);

    root.addChildren([first, second, third, fourth]);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });
  it("reduces the width of the component if width is fit-content (text)", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const phrase = "this is the contnet";

    const root = new DisplayComponent().setLayout(layout);

    const parent = new DisplayComponent()
      .setWidth("fit-content")
      .setContent(phrase);

    parent.styles().setBackgroundColor(colors.RED_BACKGROUND);

    root.addChildren(parent);

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
    expect(parent.layout().width).eq(phrase.length);
  });
  it("reduces the height of the component if width is fit-content (text)", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const phrase = "this is the \n contnet";

    const root = new DisplayComponent().setLayout(layout);

    const parent = new DisplayComponent()
      .setHeight("fit-content")
      .setContent(phrase);

    parent.styles().setBackgroundColor(colors.RED_BACKGROUND);

    root.addChildren(parent);

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
    expect(parent.layout().height).eq(parent.content().buffer().count());
  });
  it("reduces the dimensions of the component if width and height is fit-content (text)", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const phrase = "this is the \n contnet";

    const root = new DisplayComponent().setLayout(layout);

    const parent = new DisplayComponent()
      .setHeight("fit-content")
      .setWidth("fit-content")
      .setContent(phrase);

    parent.styles().setBackgroundColor(colors.RED_BACKGROUND);

    root.addChildren(parent);

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
    expect(parent.layout().width).eq(parent.content().width());
    expect(parent.layout().height).eq(parent.content().buffer().count());
  });

  it("reduces the dimensions of component if width is fit content (children)", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent().setLayout(layout);
    const phrase = "this-is\ncontent";
    const parent = new DisplayComponent()
      .setHeight("fit-content")
      .setWidth("fit-content");

    parent.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const child = new DisplayComponent().setHeight(10).setWidth(10);

    parent.addChildren(child);

    root.addChildren(parent);

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    expect(parent.layout().width).eq(10);
    expect(parent.layout().height).eq(10);
  });
});
