import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";
import { cell, layoutAndPaint, screen } from "../../../helpers/ui.js";

// Proposed API on TextLayout, for "one bold word in a sentence" and syntax
// highlighting:
//
//   component.content().setStyleRanges([{ line, start, end, style }])
//
// Ranges are in buffer coordinates (buffer line, column start inclusive,
// end exclusive), so they keep working when the text wraps, is aligned, or
// is scrolled. A range's style is blended over the component's own style:
// whatever the range doesn't set comes from the component.

const bold = () => ComponentStyle.Create().setBold(true);

describe("styled ranges", () => {
  it("styles only the cells inside the range", () => {
    const { canvas, root } = screen(11, 1);
    root.setContent("hello world");
    root.content().setStyleRanges([{ line: 0, start: 6, end: 11, style: bold() }]);

    layoutAndPaint(root, canvas);

    for (let x = 0; x < 6; x++) {
      expect(cell(canvas, x, 0).isBold(), `x ${x}`).eq(false);
    }
    for (let x = 6; x < 11; x++) {
      expect(cell(canvas, x, 0).isBold(), `x ${x}`).eq(true);
    }
  });

  it("keeps the component's style for whatever the range doesn't set", () => {
    const { canvas, root } = screen(11, 1);
    root
      .setBackgroundColor(colors.BLUE_BACKGROUND)
      .setColor(colors.WHITE_FOREGROUND)
      .setContent("hello world");
    root.content().setStyleRanges([
      {
        line: 0,
        start: 6,
        end: 11,
        style: ComponentStyle.Create().setColor(colors.RED_FOREGROUND),
      },
    ]);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 6, 0).color()).eq(colors.RED_FOREGROUND);
    expect(cell(canvas, 6, 0).backgroundColor()).eq(colors.BLUE_BACKGROUND);
    expect(cell(canvas, 0, 0).color()).eq(colors.WHITE_FOREGROUND);
  });

  it("follows the text when it wraps", () => {
    const { canvas, root } = screen(5, 2);
    root.setContent("aaaaabbbbb");
    // columns 3..6 -> last two cells of row 0, first two of row 1
    root.content().setStyleRanges([{ line: 0, start: 3, end: 7, style: bold() }]);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 2, 0).isBold()).eq(false);
    expect(cell(canvas, 3, 0).isBold()).eq(true);
    expect(cell(canvas, 4, 0).isBold()).eq(true);
    expect(cell(canvas, 0, 1).isBold()).eq(true);
    expect(cell(canvas, 1, 1).isBold()).eq(true);
    expect(cell(canvas, 2, 1).isBold()).eq(false);
  });

  it("applies to the right buffer line", () => {
    const { canvas, root } = screen(5, 3);
    root.setContent("aaa\nbbb\nccc");
    root.content().setStyleRanges([{ line: 1, start: 0, end: 3, style: bold() }]);

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).isBold()).eq(false);
    expect(cell(canvas, 0, 1).isBold()).eq(true);
    expect(cell(canvas, 0, 2).isBold()).eq(false);
  });

  it("follows the text when it is aligned", () => {
    const { canvas, root } = screen(6, 1);
    root.setContent("ab").setTextAlign("right").setLineWidth(6);
    root.content().setStyleRanges([{ line: 0, start: 0, end: 1, style: bold() }]);

    layoutAndPaint(root, canvas);

    // "ab" sits at x 4..5, so only x 4 is bold
    expect(cell(canvas, 4, 0).isBold()).eq(true);
    expect(cell(canvas, 5, 0).isBold()).eq(false);
  });

  it("follows the text when the viewport is scrolled", () => {
    const { canvas, root } = screen(5, 2);
    root.setContent("aaa\nbbb\nccc\nddd");
    root.content().setStyleRanges([{ line: 3, start: 0, end: 3, style: bold() }]);
    root.viewport().firstLine = 2;

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 0, 0).display()).eq("c");
    expect(cell(canvas, 0, 0).isBold()).eq(false);
    expect(cell(canvas, 0, 1).isBold()).eq(true);
  });
});
