import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// Proposed API: setMinWidth(n | null), setMinHeight(n | null)
// Same box as setMaxWidth/setMaxHeight: the number is the content size, and
// padding and border go on top. When min and max disagree, min wins (CSS).

describe("minWidth", () => {
  it("gets its minimum before the others share the rest", () => {
    const { canvas, root } = screen(20, 5);
    const a = new DisplayComponent().setMinWidth(10);
    const b = new DisplayComponent();
    const c = new DisplayComponent();
    root.setDirection("horizontal").addChildren([a, b, c]);

    layoutAndPaint(root, canvas);

    expect(a.layout().width).eq(10);
    expect(b.layout().width).eq(5);
    expect(c.layout().width).eq(5);
  });

  it("wins over a smaller width", () => {
    const { canvas, root } = screen(20, 5);
    const a = new DisplayComponent().setWidth(3).setMinWidth(6);
    root.setDirection("horizontal").addChildren(a);

    layoutAndPaint(root, canvas);

    expect(a.layout().width).eq(6);
  });

  it("wins over maxWidth", () => {
    const { canvas, root } = screen(20, 5);
    const a = new DisplayComponent().setMaxWidth(4).setMinWidth(6);
    root.setDirection("horizontal").addChildren(a);

    layoutAndPaint(root, canvas);

    expect(a.layout().width).eq(6);
  });

  it("does not count padding", () => {
    const { canvas, root } = screen(20, 5);
    const a = new DisplayComponent()
      .setWidth(1)
      .setMinWidth(5)
      .setPaddingHorizontal(1);
    root.setDirection("horizontal").addChildren(a);

    layoutAndPaint(root, canvas);

    expect(a.layout().width).eq(7);
    expect(a.contentLayout().width).eq(5);
  });

  it("is used by measure()", () => {
    const a = new DisplayComponent().setMinWidth(8);

    const size = a.measure({
      minWidth: 0,
      maxWidth: 20,
      minHeight: 0,
      maxHeight: 20,
    });

    expect(size.width).eq(8);
  });
});

describe("minHeight", () => {
  it("gets its minimum before the others share the rest", () => {
    const { canvas, root } = screen(10, 20);
    const a = new DisplayComponent().setMinHeight(12);
    const b = new DisplayComponent();
    root.addChildren([a, b]);

    layoutAndPaint(root, canvas);

    expect(a.layout().height).eq(12);
    expect(b.layout().height).eq(8);
    expect(b.layout().y).eq(12);
  });

  it("wins over a smaller height", () => {
    const { canvas, root } = screen(10, 20);
    const a = new DisplayComponent().setHeight(2).setMinHeight(5);
    root.addChildren(a);

    layoutAndPaint(root, canvas);

    expect(a.layout().height).eq(5);
  });
});
