import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { cell, layoutAndPaint, rowText, screen } from "../../../helpers/ui.js";

// Position modes, following CSS:
// - "fixed": placed against the root (the screen), whatever its ancestors'
//   positions, padding or scroll. Percentages are of the root's size.
// - "relative": laid out in normal flow, then moved by startX/startY.
//   Siblings stay where they would have been.
// - "sticky": in normal flow inside a scroll container, but never scrolls
//   above startY from the container's top.
// - absolute gets right/bottom insets, proposed as setEndX/setEndY (to
//   match setStartX/setStartY). With both start and end and no width, the
//   child stretches between them.

describe("position: fixed", () => {
  // root 20x10
  // ├── spacer 20x5 (red)
  // └── container 6 wide, padding 2
  //     └── fixed
  function nested(fixed: DisplayComponent) {
    const { canvas, root } = screen(20, 10);
    const spacer = new DisplayComponent()
      .setHeight(5)
      .setBackgroundColor(colors.RED_BACKGROUND);
    const container = new DisplayComponent()
      .setWidth(6)
      .setHeight(5)
      .setPaddingHorizontal(2)
      .setPaddingVertical(2);

    container.addChildren(fixed.setPositionMode("fixed"));
    root.addChildren([spacer, container]);

    layoutAndPaint(root, canvas);

    return { canvas, container };
  }

  it("is placed against the screen, not its parent", () => {
    const fixed = new DisplayComponent()
      .setStartX(1)
      .setStartY(1)
      .setWidth(3)
      .setHeight(2);

    nested(fixed);

    expect(fixed.layout()).toEqual({ x: 1, y: 1, width: 3, height: 2 });
  });

  it("takes percentages of the screen", () => {
    const fixed = new DisplayComponent().setWidth("50%").setHeight("50%");

    nested(fixed);

    expect(fixed.layout().width).eq(10);
    expect(fixed.layout().height).eq(5);
  });

  it("is painted over normal content", () => {
    const fixed = new DisplayComponent()
      .setWidth(3)
      .setHeight(2)
      .setBackgroundColor(colors.GREEN_BACKGROUND);

    const { canvas } = nested(fixed);

    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.GREEN_BACKGROUND);
    expect(cell(canvas, 3, 0).backgroundColor()).eq(colors.RED_BACKGROUND);
  });

  it("takes no space from its siblings", () => {
    const { canvas, root } = screen(20, 10);
    const fixed = new DisplayComponent()
      .setPositionMode("fixed")
      .setWidth(3)
      .setHeight(2);
    const normal = new DisplayComponent().setHeight(2);
    root.addChildren([fixed, normal]);

    layoutAndPaint(root, canvas);

    expect(normal.layout().y).eq(0);
  });

  it("does not move when its scroll container scrolls", () => {
    const { canvas, root } = screen(20, 10);
    const container = new DisplayComponent().setHeight(5).setOverflow("scroll");
    const fixed = new DisplayComponent()
      .setPositionMode("fixed")
      .setStartY(1)
      .setWidth(3)
      .setHeight(1);
    container.addChildren(
      Array.from({ length: 10 }, () => new DisplayComponent().setHeight(1)),
    );
    container.addChildren(fixed);
    root.addChildren(container);

    container.setScrollTop(3);
    layoutAndPaint(root, canvas);

    expect(fixed.layout().y).eq(1);
  });
});

describe("position: relative", () => {
  function threeInARow() {
    const { canvas, root } = screen(20, 10);
    const items = [0, 1, 2].map(() =>
      new DisplayComponent().setWidth(4).setHeight(2),
    );
    root.setDirection("horizontal").addChildren(items);
    return { canvas, root, items };
  }

  it("is moved by startX/startY from where normal flow put it", () => {
    const { canvas, root, items } = threeInARow();
    items[1].setPositionMode("relative").setStartX(2).setStartY(1);

    layoutAndPaint(root, canvas);

    expect(items[1].layout().x).eq(6);
    expect(items[1].layout().y).eq(1);
  });

  it("leaves its siblings where they were", () => {
    const { canvas, root, items } = threeInARow();
    items[1].setPositionMode("relative").setStartX(2);

    layoutAndPaint(root, canvas);

    expect(items[0].layout().x).eq(0);
    expect(items[2].layout().x).eq(8);
  });

  it("with no offsets it sits where normal flow put it", () => {
    const { canvas, root, items } = threeInARow();
    items[1].setPositionMode("relative");

    layoutAndPaint(root, canvas);

    expect(items[1].layout().x).eq(4);
    expect(items[1].layout().y).eq(0);
  });
});

describe("position: sticky", () => {
  // a 5-row scroll container with 10 one-row items
  function list(stickyIndex: number) {
    const { canvas, root } = screen(20, 10);
    const container = new DisplayComponent()
      .setWidth(10)
      .setHeight(5)
      .setOverflow("scroll");
    const items = Array.from({ length: 10 }, (_, i) =>
      new DisplayComponent().setHeight(1).setContent(`item ${i}`),
    );
    items[stickyIndex].setPositionMode("sticky").setStartY(0);
    container.addChildren(items);
    root.addChildren(container);
    return { canvas, root, container, items };
  }

  it("scrolls normally until it reaches the top", () => {
    const { canvas, root, container, items } = list(2);

    container.setScrollTop(1);
    layoutAndPaint(root, canvas);

    expect(items[2].layout().y).eq(1);
  });

  it("stays at the top once scrolled past it", () => {
    const { canvas, root, container, items } = list(2);

    container.setScrollTop(4);
    layoutAndPaint(root, canvas);

    expect(items[2].layout().y).eq(0);
    expect(rowText(canvas, 0)).toMatch(/^item 2/);
  });

  it("does not push the other items down", () => {
    const { canvas, root, container, items } = list(2);

    container.setScrollTop(4);
    layoutAndPaint(root, canvas);

    expect(items[5].layout().y).eq(1);
  });
});

describe("absolute with end insets", () => {
  function absolute(child: DisplayComponent) {
    const { canvas, root } = screen(20, 10);
    root.addChildren(child.setPositionMode("absolute"));
    layoutAndPaint(root, canvas);
  }

  it("endX places the right edge", () => {
    const child = new DisplayComponent().setWidth(4).setHeight(2).setEndX(0);
    absolute(child);

    expect(child.layout().x).eq(16);
  });

  it("endY places the bottom edge", () => {
    const child = new DisplayComponent().setWidth(4).setHeight(2).setEndY(1);
    absolute(child);

    expect(child.layout().y).eq(7);
  });

  it("start and end together stretch a child with no width", () => {
    const child = new DisplayComponent().setHeight(1).setStartX(2).setEndX(3);
    absolute(child);

    expect(child.layout().x).eq(2);
    expect(child.layout().width).eq(15);
  });

  it("endX takes percentages", () => {
    const child = new DisplayComponent()
      .setWidth(4)
      .setHeight(2)
      .setEndX("50%");
    absolute(child);

    expect(child.layout().x).eq(6);
  });
});
