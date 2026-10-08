import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import {
  cell,
  layoutAndPaint,
  rowText,
  screen,
} from "../../../helpers/ui.js";

// Proposed API on DisplayComponent, for containers of components (the text
// ViewPort keeps handling scrolling inside a single text):
//
//   setOverflow("scroll")       clips like "hidden" and allows scrolling
//   setScrollTop(n) / scrollTop()     clamped to [0, scrollHeight - visible]
//   setScrollLeft(n) / scrollLeft()   same, horizontally
//   scrollHeight() / scrollWidth()    size of all the content
//   scrollIntoView(child)       scrolls the least amount to show child
//   verticalScrollbar()         { offset, size } of the thumb in rows, or
//                               null when everything fits
//
// The vertical scrollbar takes the last column of the padding box, so the
// content gets one column less while it shows.

// root 20x10
// └── list 10 wide, `height` tall, scrolls
//     └── `count` rows, "item 0", "item 1", ...
function list(height: number, count: number) {
  const { canvas, root } = screen(20, 10);

  const container = new DisplayComponent()
    .setWidth(10)
    .setHeight(height)
    .setOverflow("scroll");

  const items = Array.from({ length: count }, (_, i) =>
    new DisplayComponent().setHeight(1).setContent(`item ${i}`),
  );

  container.addChildren(items);
  root.addChildren(container);

  return { canvas, root, container, items };
}

describe("scrolling a container", () => {
  it("starts at the top", () => {
    const { canvas, root, container, items } = list(5, 10);

    layoutAndPaint(root, canvas);

    expect(container.scrollTop()).eq(0);
    expect(items[0].layout().y).eq(0);
    expect(rowText(canvas, 0)).toMatch(/^item 0/);
  });

  it("moves the children up by scrollTop", () => {
    const { canvas, root, container, items } = list(5, 10);

    container.setScrollTop(3);
    layoutAndPaint(root, canvas);

    expect(items[3].layout().y).eq(0);
    expect(rowText(canvas, 0)).toMatch(/^item 3/);
    expect(rowText(canvas, 4)).toMatch(/^item 7/);
  });

  it("does not paint children scrolled out of view", () => {
    const { canvas, root, container } = list(5, 10);

    container.setScrollTop(3);
    layoutAndPaint(root, canvas);

    for (let y = 5; y < 10; y++) {
      expect(rowText(canvas, y).trim()).eq("");
    }
  });

  it("reports the full content height", () => {
    const { canvas, root, container } = list(5, 10);

    layoutAndPaint(root, canvas);

    expect(container.scrollHeight()).eq(10);
  });

  it("clamps scrollTop to the content", () => {
    const { canvas, root, container } = list(5, 10);
    layoutAndPaint(root, canvas);

    container.setScrollTop(100);
    expect(container.scrollTop()).eq(5);

    container.setScrollTop(-3);
    expect(container.scrollTop()).eq(0);
  });

  it("re-lays out when scrolled after the first frame", () => {
    const { canvas, root, container, items } = list(5, 10);
    layoutAndPaint(root, canvas);

    container.setScrollTop(2);
    layoutAndPaint(root, canvas);

    expect(items[2].layout().y).eq(0);
  });

  it("scrolls horizontally with scrollLeft", () => {
    const { canvas, root } = screen(20, 10);
    const container = new DisplayComponent()
      .setDirection("horizontal")
      .setWidth(10)
      .setHeight(1)
      .setOverflow("scroll");
    const wide = new DisplayComponent()
      .setWidth(30)
      .setHeight(1)
      .setContent("0123456789abcdefghijklmnopqrst");
    container.addChildren(wide);
    root.addChildren(container);

    container.setScrollLeft(10);
    layoutAndPaint(root, canvas);

    expect(container.scrollWidth()).eq(30);
    expect(wide.layout().x).eq(-10);
    expect(rowText(canvas, 0).slice(0, 10)).eq("abcdefghij");
  });
});

describe("scrollIntoView", () => {
  it("scrolls down just enough to show a child below", () => {
    const { canvas, root, container, items } = list(5, 10);
    layoutAndPaint(root, canvas);

    container.scrollIntoView(items[7]);

    expect(container.scrollTop()).eq(3);
  });

  it("scrolls up just enough to show a child above", () => {
    const { canvas, root, container, items } = list(5, 10);
    container.setScrollTop(5);
    layoutAndPaint(root, canvas);

    container.scrollIntoView(items[1]);

    expect(container.scrollTop()).eq(1);
  });

  it("does not move when the child is already visible", () => {
    const { canvas, root, container, items } = list(5, 10);
    container.setScrollTop(2);
    layoutAndPaint(root, canvas);

    container.scrollIntoView(items[4]);

    expect(container.scrollTop()).eq(2);
  });
});

describe("vertical scrollbar", () => {
  it("is not there when everything fits", () => {
    const { canvas, root, container } = list(10, 5);

    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toBeNull();
    expect(container.contentLayout().width).eq(10);
  });

  it("takes one column from the content", () => {
    const { canvas, root, container, items } = list(10, 20);

    layoutAndPaint(root, canvas);

    expect(container.contentLayout().width).eq(9);
    expect(items[0].layout().width).eq(9);
  });

  it("has a thumb sized by how much of the content is visible", () => {
    const { canvas, root, container } = list(10, 20);

    layoutAndPaint(root, canvas);

    // 10 of 20 rows visible -> thumb is half the track
    expect(container.verticalScrollbar()).toEqual({ offset: 0, size: 5 });
  });

  it("moves the thumb to the bottom when scrolled to the end", () => {
    const { canvas, root, container } = list(10, 20);

    container.setScrollTop(10);
    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toEqual({ offset: 5, size: 5 });
  });

  it("paints the thumb in the last column", () => {
    const { canvas, root, container } = list(10, 20);
    container.setBackgroundColor(colors.BLUE_BACKGROUND);

    layoutAndPaint(root, canvas);

    const thumbTop = cell(canvas, 9, 0);
    const trackBottom = cell(canvas, 9, 9);

    expect(thumbTop.display()).not.eq(" ");
    // thumb and track have to look different, by glyph or by color
    expect(
      thumbTop.display() !== trackBottom.display() ||
        thumbTop.backgroundColor() !== trackBottom.backgroundColor() ||
        thumbTop.color() !== trackBottom.color(),
    ).eq(true);
  });
});
