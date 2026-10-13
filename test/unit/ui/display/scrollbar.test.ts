import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { cell, layoutAndPaint, screen } from "../../../helpers/ui.js";

// What a scrollbar looks like on screen. The basics (thumb size and offset,
// taking one column) are in scroll.test.ts; this is the drawing.
//
// Proposed API on DisplayComponent, on top of the one in scroll.test.ts:
//
//   setScrollbarStyle({ thumb, track, thumbColor, trackColor })
//       glyphs and colors, any field left out keeps its default
//   setScrollbar(false)         no scrollbar is drawn and the content gets
//                               its column back; it still scrolls
//   horizontalScrollbar()       { offset, size } of the thumb in columns,
//                               or null when everything fits
//
// The thumb is as long as the visible share of the track, at least one
// cell, and moves along the track with scrollTop:
//
//   size   = max(1, round(track * visible / content))
//   offset = round((track - size) * scrollTop / (content - visible))
//
// The horizontal scrollbar takes the last row of the padding box. With both
// showing, the corner cell they share belongs to neither.

const THUMB = "#";
const TRACK = ".";

// root 20x12
// └── list 10x`height`, scrolls, thumb "#", track "."
//     └── `count` rows, "item 0", "item 1", ...
function list(height: number, count: number) {
  const { canvas, root } = screen(20, 12);

  const container = new DisplayComponent()
    .setWidth(10)
    .setHeight(height)
    .setOverflow("scroll")
    .setScrollbarStyle({ thumb: THUMB, track: TRACK });

  const items = Array.from({ length: count }, (_, i) =>
    new DisplayComponent().setHeight(1).setContent(`item ${i}`),
  );

  container.addChildren(items);
  root.addChildren(container);

  return { canvas, root, container, items };
}

// the scrollbar column of a list, top to bottom: "##.........."
function scrollbarColumn(
  canvas: ReturnType<typeof screen>["canvas"],
  x: number,
  height: number,
) {
  let column = "";
  for (let y = 0; y < height; y++) {
    column += cell(canvas, x, y).display();
  }
  return column;
}

describe("drawing the vertical scrollbar", () => {
  it("draws the thumb over the track", () => {
    const { canvas, root } = list(10, 20);

    layoutAndPaint(root, canvas);

    expect(scrollbarColumn(canvas, 9, 10)).eq("#####.....");
  });

  it("moves the thumb when scrolled", () => {
    const { canvas, root, container } = list(10, 20);

    container.setScrollTop(10);
    layoutAndPaint(root, canvas);

    expect(scrollbarColumn(canvas, 9, 10)).eq(".....#####");
  });

  it("puts the thumb in the middle of the track halfway down", () => {
    // 10 of 50 rows -> 2 cell thumb; scrollTop 20 of 40 -> offset 4
    const { canvas, root, container } = list(10, 50);

    container.setScrollTop(20);
    layoutAndPaint(root, canvas);

    expect(scrollbarColumn(canvas, 9, 10)).eq("....##....");
  });

  it("keeps the thumb at least one cell long", () => {
    const { canvas, root, container } = list(10, 1000);

    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toEqual({ offset: 0, size: 1 });
    expect(scrollbarColumn(canvas, 9, 10)).eq("#.........");
  });

  it("reaches the bottom of the track at the end, however long the content", () => {
    const { canvas, root, container } = list(10, 1000);

    container.setScrollTop(990);
    layoutAndPaint(root, canvas);

    expect(scrollbarColumn(canvas, 9, 10)).eq(".........#");
  });

  // layout is cached, so scrolling after the first frame has to redraw it
  it("follows scrollTop changed after the first frame", () => {
    const { canvas, root, container } = list(10, 20);

    layoutAndPaint(root, canvas);
    container.setScrollTop(10);
    layoutAndPaint(root, canvas);

    expect(scrollbarColumn(canvas, 9, 10)).eq(".....#####");
  });

  it("does not draw over the content", () => {
    const { canvas, root } = list(10, 20);

    layoutAndPaint(root, canvas);

    // "item 0" is 6 wide, the content is 9 wide, column 9 is the scrollbar
    expect(cell(canvas, 0, 0).display()).eq("i");
    expect(cell(canvas, 8, 0).display()).eq(" ");
    expect(cell(canvas, 9, 0).display()).eq(THUMB);
  });

  it("is drawn inside the border, not over it", () => {
    const { canvas, root, container } = list(10, 20);
    container.setBorderSize(1);

    layoutAndPaint(root, canvas);

    // border at column 9, the scrollbar is the column before it
    expect(cell(canvas, 8, 1).display()).eq(THUMB);
    expect(cell(canvas, 9, 1).display()).not.eq(THUMB);
    expect(cell(canvas, 9, 1).display()).not.eq(TRACK);
  });

  it("is not drawn when everything fits", () => {
    const { canvas, root } = list(10, 5);

    layoutAndPaint(root, canvas);

    expect(scrollbarColumn(canvas, 9, 10)).not.toContain(THUMB);
    expect(scrollbarColumn(canvas, 9, 10)).not.toContain(TRACK);
  });

  it("is not drawn for overflow hidden", () => {
    const { canvas, root, container } = list(10, 20);
    container.setOverflow("hidden");

    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toBeNull();
    expect(scrollbarColumn(canvas, 9, 10)).not.toContain(THUMB);
  });

  it("disappears when the content shrinks to fit", () => {
    const { canvas, root, container, items } = list(10, 20);

    layoutAndPaint(root, canvas);
    for (const item of items.slice(5)) {
      container.removeChild(item);
    }
    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toBeNull();
    expect(container.contentLayout().width).eq(10);
    expect(scrollbarColumn(canvas, 9, 10)).not.toContain(THUMB);
  });
});

describe("scrollbar style", () => {
  it("colors the thumb and the track", () => {
    const { canvas, root, container } = list(10, 20);
    container.setScrollbarStyle({
      thumbColor: colors.WHITE_BACKGROUND,
      trackColor: colors.BLACK_BACKGROUND,
    });

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 9, 0).backgroundColor()).eq(colors.WHITE_BACKGROUND);
    expect(cell(canvas, 9, 9).backgroundColor()).eq(colors.BLACK_BACKGROUND);
  });

  it("keeps the glyphs when only the colors are set", () => {
    const { canvas, root, container } = list(10, 20);
    container.setScrollbarStyle({ thumbColor: colors.WHITE_BACKGROUND });

    layoutAndPaint(root, canvas);

    expect(cell(canvas, 9, 0).display()).eq(THUMB);
    expect(cell(canvas, 9, 9).display()).eq(TRACK);
  });

  it("has defaults where thumb and track look different", () => {
    const { canvas, root } = screen(20, 12);
    const container = new DisplayComponent()
      .setWidth(10)
      .setHeight(10)
      .setOverflow("scroll")
      .addChildren(
        Array.from({ length: 20 }, () => new DisplayComponent().setHeight(1)),
      );
    root.addChildren(container);

    layoutAndPaint(root, canvas);

    const thumb = cell(canvas, 9, 0);
    const track = cell(canvas, 9, 9);
    expect(thumb.display()).not.eq(" ");
    expect(
      thumb.display() !== track.display() ||
        thumb.backgroundColor() !== track.backgroundColor() ||
        thumb.color() !== track.color(),
    ).eq(true);
  });

  it("setScrollbar(false) hides it and gives the column back", () => {
    const { canvas, root, container, items } = list(10, 20);
    container.setScrollbar(false);

    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toBeNull();
    expect(items[0].layout().width).eq(10);
    expect(scrollbarColumn(canvas, 9, 10)).not.toContain(THUMB);
  });

  it("still scrolls with the scrollbar hidden", () => {
    const { canvas, root, container, items } = list(10, 20);
    container.setScrollbar(false).setScrollTop(5);

    layoutAndPaint(root, canvas);

    expect(items[5].layout().y).eq(0);
  });
});

describe("horizontal scrollbar", () => {
  // root 20x12
  // └── box 10x5, scrolls, thumb "#", track "."
  //     └── one row 20 wide
  function wide() {
    const { canvas, root } = screen(20, 12);
    const container = new DisplayComponent()
      .setWidth(10)
      .setHeight(5)
      .setOverflow("scroll")
      .setScrollbarStyle({ thumb: THUMB, track: TRACK });
    const row = new DisplayComponent().setWidth(20).setHeight(1);
    container.addChildren(row);
    root.addChildren(container);
    return { canvas, root, container, row };
  }

  function bottomRow(canvas: ReturnType<typeof screen>["canvas"]) {
    let row = "";
    for (let x = 0; x < 10; x++) {
      row += cell(canvas, x, 4).display();
    }
    return row;
  }

  it("takes the last row when the content is too wide", () => {
    const { canvas, root, container } = wide();

    layoutAndPaint(root, canvas);

    expect(container.contentLayout().height).eq(4);
    expect(container.horizontalScrollbar()).toEqual({ offset: 0, size: 5 });
    expect(bottomRow(canvas)).eq("#####.....");
  });

  it("moves the thumb with scrollLeft", () => {
    const { canvas, root, container } = wide();

    container.setScrollLeft(10);
    layoutAndPaint(root, canvas);

    expect(bottomRow(canvas)).eq(".....#####");
  });

  it("is not there when the content fits the width", () => {
    const { canvas, root, container, row } = wide();
    row.setWidth(8);

    layoutAndPaint(root, canvas);

    expect(container.horizontalScrollbar()).toBeNull();
    expect(container.contentLayout().height).eq(5);
  });

  it("leaves the corner empty when both scrollbars show", () => {
    const { canvas, root, container } = wide();
    container.addChildren(
      Array.from({ length: 10 }, () =>
        new DisplayComponent().setWidth(20).setHeight(1),
      ),
    );

    layoutAndPaint(root, canvas);

    // each one is a cell shorter, so they don't meet in the corner
    expect(container.contentLayout().width).eq(9);
    expect(container.contentLayout().height).eq(4);
    expect(cell(canvas, 9, 4).display()).not.eq(THUMB);
    expect(cell(canvas, 9, 4).display()).not.eq(TRACK);
  });
});
