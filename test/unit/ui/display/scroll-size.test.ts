import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// scrollHeight() / scrollWidth() of a container: the size of everything it
// lays out, counted from its children (their outer boxes, margins
// included) plus its own padding. Like HTML, it's the space the children
// take, so it agrees with where layout puts them:
//
//   vertical:   height = sum of the heights, width  = the widest
//   horizontal: width  = sum of the widths,  height = the tallest
//   gaps between children count, hidden and absolute children don't
//
// The container here is 10x5 and scrolls; root is 30x20 so nothing
// outside limits it.

function container() {
  const { canvas, root } = screen(30, 20);
  const box = new DisplayComponent()
    .setWidth(10)
    .setHeight(5)
    .setOverflow("scroll");
  root.addChildren(box);
  return { canvas, root, box };
}

function block(width: number, height: number) {
  return new DisplayComponent().setWidth(width).setHeight(height);
}

describe("vertical container", () => {
  it("adds up the children's heights", () => {
    const { canvas, root, box } = container();
    box.addChildren([block(4, 3), block(4, 2), block(4, 6)]);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(11);
  });

  it("is as wide as the widest child", () => {
    const { canvas, root, box } = container();
    box.addChildren([block(4, 1), block(25, 1), block(7, 1)]);

    layoutAndPaint(root, canvas);

    expect(box.scrollWidth()).eq(25);
  });
});

describe("horizontal container", () => {
  it("adds up the children's widths", () => {
    const { canvas, root, box } = container();
    box.setDirection("horizontal");
    box.addChildren([block(6, 1), block(8, 1), block(5, 1)]);

    layoutAndPaint(root, canvas);

    expect(box.scrollWidth()).eq(19);
  });

  it("is as tall as the tallest child", () => {
    const { canvas, root, box } = container();
    box.setDirection("horizontal");
    box.addChildren([block(2, 3), block(2, 9), block(2, 4)]);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(9);
  });
});

describe("what counts", () => {
  it("counts the children's margins", () => {
    const { canvas, root, box } = container();
    box.addChildren([
      block(4, 3).setMarginTop(1).setMarginBottom(2),
      block(4, 3).setMarginLeft(3).setMarginRight(1),
    ]);

    layoutAndPaint(root, canvas);

    // 1 + 3 + 2 + 3 tall; the widest is 3 + 4 + 1
    expect(box.scrollHeight()).eq(9);
    expect(box.scrollWidth()).eq(8);
  });

  it("counts its own padding", () => {
    const { canvas, root, box } = container();
    box.setPaddingVertical(1).setPaddingHorizontal(2);
    box.addChildren([block(20, 4), block(20, 4)]);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(1 + 8 + 1);
    expect(box.scrollWidth()).eq(2 + 20 + 2);
  });

  it("counts the gaps between children", () => {
    const { canvas, root, box } = container();
    box.setGap(2);
    box.addChildren([block(4, 3), block(4, 3), block(4, 3)]);

    layoutAndPaint(root, canvas);

    // 3 children, 2 gaps
    expect(box.scrollHeight()).eq(3 * 3 + 2 * 2);
  });

  it("agrees with where layout puts the last child", () => {
    const { canvas, root, box } = container();
    const children = [
      block(4, 3).setMarginBottom(1),
      block(4, 2),
      block(4, 4).setMarginTop(2),
    ];
    box.setGap(1).setPaddingVertical(1);
    box.addChildren(children);

    layoutAndPaint(root, canvas);

    const last = children[2];
    const bottom =
      last.layout().y + last.layout().height + last.margin().bottom;
    expect(box.scrollHeight()).eq(bottom - box.layout().y + 1);
  });

  it("does not count hidden children", () => {
    const { canvas, root, box } = container();
    box.addChildren([block(4, 3), block(40, 6).setVisible(false), block(4, 2)]);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(5);
    expect(box.scrollWidth()).eq(4);
  });

  it("does not count display none children", () => {
    const { canvas, root, box } = container();
    box.addChildren([block(4, 3), block(40, 6).setDisplay("none")]);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(3);
    expect(box.scrollWidth()).eq(4);
  });

  it("does not count absolute children", () => {
    const { canvas, root, box } = container();
    box.addChildren([
      block(4, 3),
      block(40, 30).setPositionMode("absolute"),
    ]);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(3);
    expect(box.scrollWidth()).eq(4);
  });

  it("counts a scrolling child by its box, not by what's inside it", () => {
    const { canvas, root, box } = container();
    const inner = block(8, 3).setOverflow("scroll");
    inner.addChildren([block(8, 50)]);
    box.addChildren([inner, block(4, 2)]);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(5);
  });

  it("is only the padding with no children", () => {
    const { canvas, root, box } = container();
    box.setPaddingVertical(1);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(2);
    expect(box.scrollWidth()).eq(0);
  });
});

describe("keeping up with changes", () => {
  it("follows a child that grows after the first frame", () => {
    const { canvas, root, box } = container();
    const child = block(4, 3);
    box.addChildren([child, block(4, 3)]);

    layoutAndPaint(root, canvas);
    child.setHeight(10);
    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(13);
  });

  it("follows children added and removed after the first frame", () => {
    const { canvas, root, box } = container();
    const first = block(4, 3);
    box.addChildren([first]);

    layoutAndPaint(root, canvas);
    box.addChildren([block(4, 4), block(4, 4)]);
    layoutAndPaint(root, canvas);
    expect(box.scrollHeight()).eq(11);

    box.removeChild(first);
    layoutAndPaint(root, canvas);
    expect(box.scrollHeight()).eq(8);
  });
});
