import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { layoutAndPaint, rowText, screen } from "../../../helpers/ui.js";

// A component's own text takes space in its content, like in HTML: it is
// laid out as if it were the first child (an anonymous box), and the real
// children come after it instead of on top of it.
//
//   vertical:   the text is a block of its lines, children start below it
//   horizontal: the text is a box as wide as its longest line, children
//               start to the right of it
//
// - gap applies between the text and the first child, like between children
// - the text wraps at the content width before the children are placed
// - auto sizes and scroll sizes count the text plus the children
// - no text (or empty text) takes no space, so components without text lay
//   out as before
// - absolute children don't care about the text

function box() {
  const { canvas, root } = screen(30, 20);
  const component = new DisplayComponent();
  root.addChildren(component);
  return { canvas, root, component };
}

function child(width: number, height: number, text?: string) {
  const out = new DisplayComponent().setWidth(width).setHeight(height);
  if (text !== undefined) {
    out.setContent(text);
  }
  return out;
}

describe("vertical: children start below the text", () => {
  it("puts the first child under the last line of text", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1, "kid");
    component.setContent("hello\nworld").addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().y).eq(2);
    expect(kid.layout().x).eq(0);
  });

  it("paints the text and the child without covering each other", () => {
    const { canvas, root, component } = box();
    component.setContent("hello\nworld").addChildren(child(3, 1, "kid"));

    layoutAndPaint(root, canvas);

    expect(rowText(canvas, 0)).toMatch(/^hello/);
    expect(rowText(canvas, 1)).toMatch(/^world/);
    expect(rowText(canvas, 2)).toMatch(/^kid/);
  });

  it("stacks the children after the text as usual", () => {
    const { canvas, root, component } = box();
    const kids = [child(3, 2), child(3, 1)];
    component.setContent("a\nb\nc").addChildren(kids);

    layoutAndPaint(root, canvas);

    expect(kids[0].layout().y).eq(3);
    expect(kids[1].layout().y).eq(5);
  });

  it("puts the gap between the text and the first child", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1);
    component.setContent("hello").setGap(2).addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().y).eq(1 + 2);
  });

  it("starts the text and the children inside the padding", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1);
    component
      .setContent("hello")
      .setPaddingVertical(1)
      .setPaddingHorizontal(2)
      .addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().x).eq(2);
    expect(kid.layout().y).eq(1 + 1);
  });

  it("wraps the text at the content width before placing the children", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1);
    // 8 characters in 4 columns: 2 rows
    component.setWidth(4).setContent("abcdefgh").addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().y).eq(2);
  });

  it("fits its auto size around the text and the children", () => {
    const { canvas, root, component } = box();
    component.setContent("hello\nworld").addChildren(child(8, 3));

    layoutAndPaint(root, canvas);

    // 2 rows of text + 3 of the child; as wide as the widest of the two
    expect(component.measuredSize().height).eq(5);
    expect(component.measuredSize().width).eq(8);
  });

  it("counts the text in scrollHeight", () => {
    const { canvas, root, component } = box();
    component
      .setWidth(10)
      .setHeight(3)
      .setOverflow("scroll")
      .setContent("a\nb\nc\nd")
      .addChildren([child(3, 2), child(3, 2)]);

    layoutAndPaint(root, canvas);

    expect(component.scrollHeight()).eq(4 + 2 + 2);
  });
});

describe("horizontal: children start right of the text", () => {
  it("puts the first child after the longest line", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1, "kid");
    component
      .setDirection("horizontal")
      .setContent("ab\nabcd")
      .addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().x).eq(4);
    expect(kid.layout().y).eq(0);
  });

  it("paints the text and the child side by side", () => {
    const { canvas, root, component } = box();
    component
      .setDirection("horizontal")
      .setContent("abcd")
      .addChildren(child(3, 1, "kid"));

    layoutAndPaint(root, canvas);

    expect(rowText(canvas, 0)).toMatch(/^abcdkid/);
  });

  it("puts the gap between the text and the first child", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1);
    component
      .setDirection("horizontal")
      .setContent("abcd")
      .setGap(1)
      .addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().x).eq(4 + 1);
  });

  it("fits its auto size around the text and the children", () => {
    const { canvas, root, component } = box();
    component
      .setDirection("horizontal")
      .setContent("abcd\nef")
      .addChildren(child(3, 5));

    layoutAndPaint(root, canvas);

    // 4 columns of text + 3 of the child; as tall as the taller of the two
    expect(component.measuredSize().width).eq(7);
    expect(component.measuredSize().height).eq(5);
  });
});

describe("what doesn't change", () => {
  it("lays children out from the top without text", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1);
    component.addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().y).eq(0);
  });

  it("gives empty text no space", () => {
    const { canvas, root, component } = box();
    const kid = child(3, 1);
    component.setContent("").addChildren(kid);

    layoutAndPaint(root, canvas);

    expect(kid.layout().y).eq(0);
  });

  it("keeps the text where it is when there are no children", () => {
    const { canvas, root, component } = box();
    component.setContent("hello");

    layoutAndPaint(root, canvas);

    expect(rowText(canvas, 0)).toMatch(/^hello/);
    expect(component.measuredSize().height).eq(1);
  });

  it("does not move absolute children for the text", () => {
    const { canvas, root, component } = box();
    const floating = child(3, 1).setPositionMode("absolute");
    component.setContent("hello\nworld").addChildren(floating);

    layoutAndPaint(root, canvas);

    expect(floating.layout().y).eq(0);
  });
});
