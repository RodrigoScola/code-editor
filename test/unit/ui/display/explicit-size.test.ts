import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, rowText, screen } from "../../../helpers/ui.js";

// An explicit width/height is not shrunk to the space the parent offers, like
// CSS: a child bigger than its parent overflows it, and the parent's overflow
// decides whether that gets clipped, scrolled or painted. Only the component's
// own min/max size limits it. "auto" sizes still stay inside the parent.

const constraints = (maxWidth: number, maxHeight: number) => ({
  minWidth: 0,
  maxWidth,
  minHeight: 0,
  maxHeight,
});

describe("explicit size in measure()", () => {
  it("keeps a width bigger than the space given", () => {
    const a = new DisplayComponent().setWidth(30).setHeight(1);

    expect(a.measure(constraints(10, 10)).width).eq(30);
  });

  it("keeps a height bigger than the space given", () => {
    const a = new DisplayComponent().setWidth(1).setHeight(30);

    expect(a.measure(constraints(10, 10)).height).eq(30);
  });

  it("keeps padding and border on top of it", () => {
    const a = new DisplayComponent()
      .setWidth(30)
      .setHeight(1)
      .setPaddingHorizontal(1);

    expect(a.measure(constraints(10, 10)).width).eq(32);
  });

  it("is still limited by its own maxWidth", () => {
    const a = new DisplayComponent().setWidth(30).setHeight(1).setMaxWidth(20);

    expect(a.measure(constraints(10, 10)).width).eq(20);
  });

  it("still lets an auto width shrink to the space given", () => {
    const a = new DisplayComponent().setContent("x".repeat(30));

    expect(a.measure(constraints(10, 10)).width).eq(10);
  });
});

describe("explicit size in layout", () => {
  // root 20x10
  // └── parent 10x3
  //     └── child 30x1
  function wideChild(direction: "horizontal" | "vertical") {
    const { canvas, root } = screen(20, 10);
    const parent = new DisplayComponent()
      .setDirection(direction)
      .setWidth(10)
      .setHeight(3);
    const child = new DisplayComponent()
      .setWidth(30)
      .setHeight(1)
      .setContent("0123456789abcdefghijklmnopqrst");
    parent.addChildren(child);
    root.addChildren(parent);

    return { canvas, root, parent, child };
  }

  it("overflows a narrower parent in a row", () => {
    const { canvas, root, child } = wideChild("horizontal");

    layoutAndPaint(root, canvas);

    expect(child.layout().width).eq(30);
  });

  it("overflows a narrower parent in a column", () => {
    const { canvas, root, child } = wideChild("vertical");

    layoutAndPaint(root, canvas);

    expect(child.layout().width).eq(30);
  });

  it("overflows a shorter parent", () => {
    const { canvas, root } = screen(20, 10);
    const parent = new DisplayComponent().setWidth(10).setHeight(3);
    const child = new DisplayComponent().setWidth(5).setHeight(8);
    parent.addChildren(child);
    root.addChildren(parent);

    layoutAndPaint(root, canvas);

    expect(child.layout().height).eq(8);
  });

  it("keeps its size when the parent clips it", () => {
    const { canvas, root, parent, child } = wideChild("horizontal");
    parent.setOverflow("hidden");

    layoutAndPaint(root, canvas);

    expect(child.layout().width).eq(30);
    expect(rowText(canvas, 0)).eq("0123456789" + " ".repeat(10));
  });
});
