import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, screen, screenText } from "../../../helpers/ui.js";

// A component's text height depends on the width it gets: 20 characters in
// 10 columns is 2 lines. Measuring has to wrap the text at the width it is
// given, and wrapping has to use the content box (inside padding/border),
// not the outer box.

const constraints = (maxWidth: number) => ({
  minWidth: 0,
  maxWidth,
  minHeight: 0,
  maxHeight: Infinity,
});

describe("measuring wrapped text", () => {
  it("measure() counts wrapped lines for the width it is given", () => {
    const label = new DisplayComponent().setContent("a".repeat(20));

    const size = label.measure(constraints(10));

    expect(size.width).eq(10);
    expect(size.height).eq(2);
  });

  it("measure() adds padding to the wrapped height", () => {
    const label = new DisplayComponent()
      .setContent("a".repeat(20))
      .setPaddingVertical(1);

    const size = label.measure(constraints(10));

    expect(size.height).eq(4);
  });

  it("a fit-content child is as tall as its wrapped text on the first frame", () => {
    const { canvas, root } = screen(10, 10);
    const label = new DisplayComponent()
      .setHeight("fit-content")
      .setContent("a".repeat(20));
    const below = new DisplayComponent().setHeight(1);
    root.addChildren([label, below]);

    layoutAndPaint(root, canvas);

    expect(label.layout().height).eq(2);
    expect(below.layout().y).eq(2);
  });

  it("measures word-wrapped text", () => {
    const label = new DisplayComponent().setContent("hello world foo");
    label.content().setWrapMode("word");

    const size = label.measure(constraints(8));

    expect(size.height).eq(3);
  });
});

describe("wrapping inside padding and border", () => {
  it("wraps at the content width when there is padding", () => {
    const { canvas, root } = screen(10, 3);
    const label = new DisplayComponent()
      .setPaddingHorizontal(2)
      .setContent("abcdefghijkl");
    root.addChildren(label);

    layoutAndPaint(root, canvas);

    // 10 wide - 2 - 2 = 6 columns of text
    expect(label.content().lines().map((line) => line.content())).toEqual([
      "abcdef",
      "ghijkl",
    ]);
    expect(screenText(canvas)).eq("  abcdef\n  ghijkl\n");
  });

  it("wraps at the content width when there is a border", () => {
    const { canvas, root } = screen(10, 4);
    const label = new DisplayComponent()
      .setBorderSize(1)
      .setContent("abcdefghijklmnop");
    root.addChildren(label);

    layoutAndPaint(root, canvas);

    // 10 wide - 1 - 1 = 8 columns of text
    expect(label.content().lines().map((line) => line.content())).toEqual([
      "abcdefgh",
      "ijklmnop",
    ]);
  });
});
