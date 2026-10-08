import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// Proposed API: setFlexGrow(n), setFlexShrink(n), setFlexBasis(size)
//
// Today auto-sized children split the free space equally. To keep that,
// flexGrow defaults to 1 for auto-sized children (CSS defaults it to 0).
// Everything else follows CSS:
// - free space = container size - fixed sizes - bases, shared by flexGrow
// - flexGrow 0 keeps a child at its basis (content size when basis is auto)
// - when fixed sizes overflow (no wrap), each child shrinks in proportion to
//   flexShrink * its size
// - min/max sizes still win
//
// The shrink tests set flexShrink on every child, so they hold whatever its
// default ends up being.

function row(width: number, children: DisplayComponent[]) {
  const { canvas, root } = screen(width, 5);
  root.setDirection("horizontal").addChildren(children);
  layoutAndPaint(root, canvas);
  return root;
}

const widths = (children: DisplayComponent[]) =>
  children.map((child) => child.layout().width);

describe("flex-grow", () => {
  it("shares free space in proportion to grow", () => {
    const a = new DisplayComponent().setFlexGrow(1);
    const b = new DisplayComponent().setFlexGrow(2);

    row(30, [a, b]);

    expect(widths([a, b])).toEqual([10, 20]);
    expect(b.layout().x).eq(10);
  });

  it("grow 0 keeps a child at its content size", () => {
    const a = new DisplayComponent().setFlexGrow(0).setContent("abc");
    const b = new DisplayComponent().setFlexGrow(1);

    row(30, [a, b]);

    expect(widths([a, b])).toEqual([3, 27]);
  });

  it("only shares what fixed-size siblings leave", () => {
    const fixed = new DisplayComponent().setWidth(10);
    const a = new DisplayComponent().setFlexGrow(1);
    const b = new DisplayComponent().setFlexGrow(1);

    row(30, [fixed, a, b]);

    expect(widths([fixed, a, b])).toEqual([10, 10, 10]);
  });

  it("respects maxWidth and gives the rest to the others", () => {
    const a = new DisplayComponent().setFlexGrow(1).setMaxWidth(5);
    const b = new DisplayComponent().setFlexGrow(1);

    row(30, [a, b]);

    expect(widths([a, b])).toEqual([5, 25]);
  });

  it("works on the vertical axis", () => {
    const { canvas, root } = screen(10, 30);
    const a = new DisplayComponent().setFlexGrow(1);
    const b = new DisplayComponent().setFlexGrow(2);
    root.addChildren([a, b]);

    layoutAndPaint(root, canvas);

    expect(a.layout().height).eq(10);
    expect(b.layout().height).eq(20);
    expect(b.layout().y).eq(10);
  });
});

describe("flex-basis", () => {
  it("is the starting size before free space is shared", () => {
    const a = new DisplayComponent().setFlexBasis(10).setFlexGrow(1);
    const b = new DisplayComponent().setFlexBasis(0).setFlexGrow(1);

    row(30, [a, b]);

    // 30 - 10 - 0 = 20 free, 10 each
    expect(widths([a, b])).toEqual([20, 10]);
  });

  it("accepts percentages", () => {
    const a = new DisplayComponent().setFlexBasis("50%").setFlexGrow(0);
    const b = new DisplayComponent().setFlexGrow(1);

    row(30, [a, b]);

    expect(widths([a, b])).toEqual([15, 15]);
  });
});

describe("flex-shrink", () => {
  it("shrinks overflowing children equally when sizes and shrink are equal", () => {
    const a = new DisplayComponent().setWidth(20).setFlexShrink(1);
    const b = new DisplayComponent().setWidth(20).setFlexShrink(1);

    row(30, [a, b]);

    expect(widths([a, b])).toEqual([15, 15]);
  });

  it("shrinks bigger children more", () => {
    // 60 in 30: 30 too much, taken 40:20 from a and b
    const a = new DisplayComponent().setWidth(40).setFlexShrink(1);
    const b = new DisplayComponent().setWidth(20).setFlexShrink(1);

    row(30, [a, b]);

    expect(widths([a, b])).toEqual([20, 10]);
  });

  it("shrink 0 keeps a child at its size", () => {
    const a = new DisplayComponent().setWidth(20).setFlexShrink(0);
    const b = new DisplayComponent().setWidth(20).setFlexShrink(1);

    row(30, [a, b]);

    expect(widths([a, b])).toEqual([20, 10]);
  });

  it("does not shrink when the row wraps instead", () => {
    const { canvas, root } = screen(30, 10);
    const a = new DisplayComponent().setWidth(20).setHeight(1).setFlexShrink(1);
    const b = new DisplayComponent().setWidth(20).setHeight(1).setFlexShrink(1);
    root.setDirection("horizontal").setWrap("wrap").addChildren([a, b]);

    layoutAndPaint(root, canvas);

    expect(widths([a, b])).toEqual([20, 20]);
  });
});
