import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors/colors.js";
import { TerminalCanvas } from "../../../../src/ui/Canvas/TerminalCanvas.js";
import { ComponentStyle } from "../../../../src/ui/styles/ComponentStyles.js";
import { Configuration } from "../../../../src/config.js";
import { LayoutBounds } from "../../../../src/ui/layout/LayoutBounds.js";
import { cell } from "../../../helpers/ui.js";

// canvas.drawVerticalText: drawText turned 90 degrees.
//
//   drawVerticalText(bounds, text, style?)
//
// - the text goes down from bounds.x, bounds.y, one character per row
// - "\n" starts the next column, one to the right
// - stops at the bottom of bounds (characters) and its right edge (columns)
// - tabs expand to the next tab stop, downwards
// - cells outside the canvas clip are skipped, the ones after still paint
// - with a style the cells take it blended over the default; without one
//   they keep their own colors and only the glyph changes

function canvas(width: number, height: number = width) {
  return new TerminalCanvas().setLayout(LayoutBounds.Create(width, height));
}

// x, y, width, height
function bounds(x: number, y: number, width: number, height: number) {
  return LayoutBounds.Create(width, height, x, y);
}

function column(c: TerminalCanvas, x: number, from: number, to: number) {
  let out = "";
  for (let y = from; y < to; y++) {
    out += cell(c, x, y).display();
  }
  return out;
}

function row(c: TerminalCanvas, y: number, from: number, to: number) {
  let out = "";
  for (let x = from; x < to; x++) {
    out += cell(c, x, y).display();
  }
  return out;
}

describe("drawVerticalText", () => {
  it("draws the text down a column", () => {
    const c = canvas(10);

    c.drawVerticalText(bounds(2, 1, 1, 5), "abc");

    expect(column(c, 2, 1, 4)).eq("abc");
    // nothing beside or above it
    expect(column(c, 1, 0, 10)).eq(" ".repeat(10));
    expect(column(c, 3, 0, 10)).eq(" ".repeat(10));
    expect(cell(c, 2, 0).display()).eq(" ");
  });

  it("starts the next column at a newline", () => {
    const c = canvas(10);

    c.drawVerticalText(bounds(0, 0, 3, 5), "ab\ncd\nef");

    expect(column(c, 0, 0, 2)).eq("ab");
    expect(column(c, 1, 0, 2)).eq("cd");
    expect(column(c, 2, 0, 2)).eq("ef");
    expect(row(c, 0, 0, 3)).eq("ace");
  });

  it("stops at the bottom of the bounds", () => {
    const c = canvas(10);

    c.drawVerticalText(bounds(0, 0, 1, 3), "abcdef");

    expect(column(c, 0, 0, 3)).eq("abc");
    expect(column(c, 0, 3, 10)).eq(" ".repeat(7));
  });

  it("stops at the right edge of the bounds", () => {
    const c = canvas(10);

    c.drawVerticalText(bounds(0, 0, 2, 3), "a\nb\nc\nd");

    expect(row(c, 0, 0, 4)).eq("ab  ");
  });

  it("draws nothing outside the canvas", () => {
    const c = canvas(3);

    // runs past the bottom and the right of a 3x3 canvas, and doesn't throw
    c.drawVerticalText(bounds(2, 1, 5, 10), "abcdef\nghijkl");

    expect(column(c, 2, 1, 3)).eq("ab");
  });

  it("draws nothing for empty text", () => {
    const c = canvas(3);

    c.drawVerticalText(bounds(0, 0, 3, 3), "");

    expect(column(c, 0, 0, 3)).eq("   ");
  });

  it("expands a tab downwards to the next tab stop", () => {
    const tab = Configuration().tab_width;
    const c = canvas(tab + 5);

    c.drawVerticalText(bounds(0, 0, 1, tab + 5), "a\tb");

    // "a", spaces to the next stop, then "b" on the row of that stop
    expect(column(c, 0, 0, tab + 1)).eq("a" + " ".repeat(tab - 1) + "b");
  });

  it("rounds a fractional position the way drawText does", () => {
    const c = canvas(10);

    c.drawVerticalText(bounds(1.4, 2.6, 1, 5), "ab");

    expect(column(c, 1, 3, 5)).eq("ab");
  });

  describe("clipping", () => {
    it("skips the cells outside the clip and paints the rest", () => {
      const c = canvas(10);
      // the clip starts at row 2: the first two characters are cut off,
      // the ones below still paint (no stopping at the first clipped cell)
      c.setClip(bounds(0, 2, 10, 8));

      c.drawVerticalText(bounds(0, 0, 1, 6), "abcdef");
      c.setClip(null);

      expect(column(c, 0, 0, 6)).eq("  cdef");
    });

    it("skips whole columns outside the clip", () => {
      const c = canvas(10);
      c.setClip(bounds(1, 0, 9, 10));

      c.drawVerticalText(bounds(0, 0, 3, 2), "ab\ncd\nef");
      c.setClip(null);

      expect(row(c, 0, 0, 3)).eq(" ce");
    });
  });

  describe("style", () => {
    it("paints the cells with the style", () => {
      const c = canvas(5);
      const style = ComponentStyle.Create()
        .setBackgroundColor(colors.BLUE)
        .setColor(colors.WHITE);

      c.drawVerticalText(bounds(0, 0, 1, 5), "ab", style);

      expect(cell(c, 0, 0).backgroundColor()).eq(colors.BLUE);
      expect(cell(c, 0, 1).color()).eq(colors.WHITE);
      // only the cells with text
      expect(cell(c, 0, 2).backgroundColor()).not.eq(colors.BLUE);
    });

    it("keeps the cell's colors without a style", () => {
      const c = canvas(5);
      c.fillRect(
        bounds(0, 0, 1, 5),
        ComponentStyle.Create().setBackgroundColor(colors.YELLOW),
      );

      c.drawVerticalText(bounds(0, 0, 1, 5), "ab");

      expect(cell(c, 0, 0).display()).eq("a");
      expect(cell(c, 0, 0).backgroundColor()).eq(colors.YELLOW);
      expect(cell(c, 0, 1).backgroundColor()).eq(colors.YELLOW);
    });

    it("does not change the style passed in", () => {
      const c = canvas(5);
      const style = ComponentStyle.Create().setDisplay("#");

      c.drawVerticalText(bounds(0, 0, 1, 5), "ab", style);

      expect(style.display()).eq("#");
    });
  });

  it("matches drawText turned 90 degrees", () => {
    const text = "abc\nde\nf";
    const across = canvas(6);
    const down = canvas(6);

    across.drawText(bounds(0, 0, 6, 6), text);
    down.drawVerticalText(bounds(0, 0, 6, 6), text);

    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 6; y++) {
        expect(cell(down, x, y).display()).eq(cell(across, y, x).display());
      }
    }
  });
});
