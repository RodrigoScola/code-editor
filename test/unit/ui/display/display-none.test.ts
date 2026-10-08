import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { cell, layoutAndPaint, screen } from "../../../helpers/ui.js";

// setDisplay("none") is stored today but nothing reads it. A component with
// display "none" takes no space and is not painted, nor is anything inside
// it, as in CSS.

describe("display: none", () => {
  it("takes no space", () => {
    const { canvas, root } = screen(20, 10);
    const a = new DisplayComponent();
    const hidden = new DisplayComponent().setDisplay("none");
    const c = new DisplayComponent();
    root.addChildren([a, hidden, c]);

    layoutAndPaint(root, canvas);

    expect(a.layout().height).eq(5);
    expect(c.layout().height).eq(5);
    expect(c.layout().y).eq(5);
  });

  it("is not painted", () => {
    const { canvas, root } = screen(20, 10);
    root.setBackgroundColor(colors.YELLOW_BACKGROUND);
    const hidden = new DisplayComponent()
      .setPositionMode("absolute")
      .setWidth(4)
      .setHeight(2)
      .setBackgroundColor(colors.RED_BACKGROUND)
      .setDisplay("none");
    root.addChildren(hidden);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });

  it("hides everything inside it", () => {
    const { canvas, root } = screen(20, 10);
    root.setBackgroundColor(colors.YELLOW_BACKGROUND);
    const hidden = new DisplayComponent()
      .setPositionMode("absolute")
      .setWidth(4)
      .setHeight(2)
      .setDisplay("none");
    const inside = new DisplayComponent()
      .setPositionMode("absolute")
      .setWidth(2)
      .setHeight(1)
      .setBackgroundColor(colors.RED_BACKGROUND)
      .setContent("x");
    hidden.addChildren(inside);
    root.addChildren(hidden);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
    expect(cell(canvas, 0, 0).display()).eq(" ");
  });

  it("is not measured", () => {
    const parent = new DisplayComponent().setDirection("horizontal");
    parent.addChildren([
      new DisplayComponent().setContent("abc"),
      new DisplayComponent().setContent("defgh").setDisplay("none"),
    ]);

    const size = parent.measure({
      minWidth: 0,
      maxWidth: 100,
      minHeight: 0,
      maxHeight: 100,
    });

    expect(size.width).eq(3);
  });

  it("comes back when set to flex again", () => {
    const { canvas, root } = screen(20, 10);
    const a = new DisplayComponent();
    const toggled = new DisplayComponent().setDisplay("none");
    root.addChildren([a, toggled]);

    layoutAndPaint(root, canvas);
    expect(a.layout().height).eq(10);

    toggled.setDisplay("flex");
    layoutAndPaint(root, canvas);

    expect(a.layout().height).eq(5);
    expect(toggled.layout().height).eq(5);
  });
});
