import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { cell, layoutAndPaint, rowText, screen } from "../../../helpers/ui.js";

// Proposed API: component.setOverflow("visible" | "hidden" | "scroll")
// (separate from setTextOverflow, which is about the component's own text).
//
// "hidden" clips everything painted by descendants (fills, text, borders,
// absolute children) to the component's padding box, like CSS.
// "visible" is the default.

// root 20x10 (yellow)
// └── parent 5x3 at (0,0) (blue)
//     └── child 10x6 (red), bigger than its parent
function overflowing() {
  const { canvas, root } = screen(20, 10);
  root.setBackgroundColor(colors.YELLOW_BACKGROUND);

  const parent = new DisplayComponent()
    .setWidth(5)
    .setHeight(3)
    .setBackgroundColor(colors.BLUE_BACKGROUND);

  const child = new DisplayComponent()
    .setWidth(10)
    .setHeight(6)
    .setBackgroundColor(colors.RED_BACKGROUND);

  parent.addChildren(child);
  root.addChildren(parent);

  return { canvas, root, parent, child };
}

describe("overflow: visible (default)", () => {
  it("lets a child paint outside its parent", () => {
    const { canvas, root } = overflowing();

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 7, 0).backgroundColor()).eq(colors.RED_BACKGROUND);
  });
});

describe("overflow: hidden", () => {
  it("keeps the child inside the parent horizontally", () => {
    const { canvas, root, parent } = overflowing();
    parent.setOverflow("hidden");

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 4, 0).backgroundColor()).eq(colors.RED_BACKGROUND);
    expect(cell(canvas, 5, 0).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });

  it("keeps the child inside the parent vertically", () => {
    const { canvas, root, parent } = overflowing();
    parent.setOverflow("hidden");

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 2).backgroundColor()).eq(colors.RED_BACKGROUND);
    expect(cell(canvas, 0, 3).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });

  it("clips the child's text", () => {
    const { canvas, root, parent, child } = overflowing();
    parent.setOverflow("hidden");
    child.setContent("abcdefghij");

    layoutAndPaint(root, canvas);

    expect(rowText(canvas, 0).slice(0, 10)).eq("abcde     ");
  });

  it("clips grandchildren even when the child in between is visible", () => {
    const { canvas, root, parent, child } = overflowing();
    parent.setOverflow("hidden");

    const grandchild = new DisplayComponent()
      .setWidth(10)
      .setHeight(6)
      .setBackgroundColor(colors.GREEN_BACKGROUND);
    child.addChildren(grandchild);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 4, 2).backgroundColor()).eq(colors.GREEN_BACKGROUND);
    expect(cell(canvas, 8, 2).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
    expect(cell(canvas, 4, 4).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });

  it("clips absolutely positioned children", () => {
    const { canvas, root, parent } = overflowing();
    parent.setOverflow("hidden");

    const popup = new DisplayComponent()
      .setPositionMode("absolute")
      .setStartX(3)
      .setStartY(1)
      .setWidth(6)
      .setHeight(4)
      .setBackgroundColor(colors.GREEN_BACKGROUND);
    parent.addChildren(popup);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 4, 1).backgroundColor()).eq(colors.GREEN_BACKGROUND);
    expect(cell(canvas, 6, 1).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
    expect(cell(canvas, 4, 3).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });

  it("clips to the padding box, so children never cover the border", () => {
    const { canvas, root, parent } = overflowing();
    parent.setOverflow("hidden").setWidth(3).setHeight(1).setBorderSize(1);

    layoutAndPaint(root, canvas);

    // the parent is 5x3 on the outside: border at x 0 and 4, y 0 and 2
    expect(cell(canvas, 1, 1).backgroundColor()).eq(colors.RED_BACKGROUND);
    expect(cell(canvas, 4, 1).display()).not.eq(" ");
    expect(cell(canvas, 2, 2).display()).not.eq(" ");
    expect(cell(canvas, 5, 1).backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });

  it("does not change the child's layout, only what gets painted", () => {
    const { canvas, root, parent, child } = overflowing();
    parent.setOverflow("hidden");

    layoutAndPaint(root, canvas);

    expect(child.layout().width).eq(10);
    expect(child.layout().height).eq(6);
  });
});
