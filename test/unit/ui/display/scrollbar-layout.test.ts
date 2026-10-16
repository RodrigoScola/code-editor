import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import {
  ScrollBar,
  ScrollBarStyle,
} from "../../../../src/ui/components/Scrollbar.js";
import { cell, layoutAndPaint, screen, show } from "../../../helpers/ui.js";

// The scrollbar the way HTML does it, in the order to build it: each step
// only needs the ones above it, and nothing a later step adds breaks an
// earlier one (until step 7 every test has content that doesn't fit, so the
// bar showing all the time is fine).
//
//   1. the thumb math, on its own
//   2. layout fills in the thumb for a scrolling container
//   3. paint it, after the children so they don't cover it
//   4. it takes its own column / row: the content gets that much less
//   5. children are clipped out of it
//   6. it sits between the border and the padding
//   7. it's only there when the content doesn't fit
//   8. both at once: the corner, and the smaller visible size
//
// New API for step 1:
//
//   ScrollBar.Thumb(track, visible, content, scroll) -> { offset, size }
//
//     size   = max(1, round(track * visible / content))
//     offset = round((track - size) * scroll / (content - visible))

const THUMB = "#";
const TRACK = ".";
const BAR = /^[#.]+$/;

function scrolling(width: number, height: number) {
  return new DisplayComponent()
    .setWidth(width)
    .setHeight(height)
    .setOverflow("scroll")
    .setScrollbarStyle(ScrollBarStyle.Create().setThumb(THUMB).setTrack(TRACK));
}

// `count` rows, "row 0", "row 1", ..., on a background so it shows if they
// paint where the bar should be
function rows(count: number, rowWidth?: number) {
  return Array.from({ length: count }, (_, i) => {
    const row = new DisplayComponent()
      .setHeight(1)
      .setContent(`row ${i}`)
      .setBackgroundColor(colors.BLUE_BACKGROUND);
    if (rowWidth !== undefined) {
      row.setWidth(rowWidth);
    }
    return row;
  });
}

// root 20x12
// └── 10x`height`, scrolls
//     └── `count` rows
function list(height: number, count: number, rowWidth?: number) {
  const { canvas, root } = screen(20, 12);
  const items = rows(count, rowWidth);
  const container = scrolling(10, height).addChildren(items);
  root.addChildren(container);
  return { canvas, root, container, items };
}

type Canvas = ReturnType<typeof screen>["canvas"];

function column(canvas: Canvas, x: number, from: number, to: number) {
  let out = "";
  for (let y = from; y < to; y++) {
    out += cell(canvas, x, y).display();
  }
  return out;
}

function row(canvas: Canvas, y: number, from: number, to: number) {
  let out = "";
  for (let x = from; x < to; x++) {
    out += cell(canvas, x, y).display();
  }
  return out;
}

describe("1. the thumb math", () => {
  it("is as long as the visible share of the track", () => {
    // 10 of 20 visible -> half the track
    expect(ScrollBar.Thumb(10, 10, 20, 0)).toEqual({ offset: 0, size: 5 });
  });

  it("is at least one cell long", () => {
    expect(ScrollBar.Thumb(10, 10, 1000, 0)).toEqual({ offset: 0, size: 1 });
  });

  it("is at the start of the track when not scrolled", () => {
    expect(ScrollBar.Thumb(10, 10, 50, 0).offset).eq(0);
  });

  it("is at the end of the track when scrolled to the end", () => {
    expect(ScrollBar.Thumb(10, 10, 20, 10)).toEqual({ offset: 5, size: 5 });
    expect(ScrollBar.Thumb(10, 10, 1000, 990)).toEqual({ offset: 9, size: 1 });
  });

  it("is in the middle halfway down", () => {
    // 10 of 50 -> 2 long; scroll 20 of 40 -> half of the 8 it can move
    expect(ScrollBar.Thumb(10, 10, 50, 20)).toEqual({ offset: 4, size: 2 });
  });
});

describe("2. layout fills in the thumb", () => {
  it("has the vertical thumb after layout", () => {
    const { canvas, root, container } = list(10, 20);

    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()?.offset()).toEqual(0);
    expect(container.verticalScrollbar()?.size()).toEqual(5);
  });

  it("moves the vertical thumb with scrollTop", () => {
    const { canvas, root, container } = list(10, 20);

    container.setScrollTop(10);
    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()?.offset()).toEqual(5);
    expect(container.verticalScrollbar()?.size()).toEqual(5);
  });

  it("follows scrollTop changed after the first frame", () => {
    const { canvas, root, container } = list(10, 20);

    layoutAndPaint(root, canvas);
    container.setScrollTop(10);
    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()?.offset()).toEqual(5);
    expect(container.verticalScrollbar()?.size()).toEqual(5);
  });

  it("has the horizontal thumb, moved by scrollLeft", () => {
    // 3 rows 20 wide in a 10x5 box: too wide, not too tall
    const { canvas, root, container } = list(5, 3, 20);

    container.setScrollLeft(10);
    layoutAndPaint(root, canvas);

    expect(container.horizontalScrollbar()?.offset()).toEqual(5);
    expect(container.horizontalScrollbar()?.size()).toEqual(5);
  });
});

describe("3. painting", () => {
  it("paints the vertical bar in the last column, over the rows", () => {
    // every row of the box has a row on it with a background, so the bar
    // has to be painted after them
    const { canvas, root } = list(10, 20);

    layoutAndPaint(root, canvas);

    expect(column(canvas, 9, 0, 10)).eq("#####.....");
  });

  it("moves the painted thumb when scrolled", () => {
    const { canvas, root, container } = list(10, 20);

    layoutAndPaint(root, canvas);
    container.setScrollTop(10);
    layoutAndPaint(root, canvas);

    expect(column(canvas, 9, 0, 10)).eq(".....#####");
  });

  it("paints the horizontal bar on the last row", () => {
    const { canvas, root, container } = list(5, 3, 20);

    container.setScrollLeft(10);
    layoutAndPaint(root, canvas);

    expect(row(canvas, 4, 0, 10)).eq(".....#####");
  });
});

describe("4. the bar takes its own space", () => {
  it("gives the content one column less for the vertical bar", () => {
    const { canvas, root, container, items } = list(10, 20);

    layoutAndPaint(root, canvas);

    expect(container.contentLayout().width).eq(9);
    expect(items[0].layout().width).eq(9);
    expect(row(canvas, 0, 0, 10)).eq("row 0    #");
  });

  it("gives the content one row less for the horizontal bar", () => {
    // 4 rows fit the 4 rows left above the bar
    const { canvas, root, container, items } = list(5, 4, 20);

    layoutAndPaint(root, canvas);

    expect(container.contentLayout().height).eq(4);
    expect(items[3].layout().y).eq(3);
    expect(row(canvas, 3, 0, 5)).eq("row 3");
    expect(row(canvas, 4, 0, 10)).toMatch(BAR);
  });
});

describe("5. children are clipped out of the bar", () => {
  it("does not let a too-wide grandchild paint over the vertical bar", () => {
    const { canvas, root, container } = list(10, 20);
    // the row is 9 wide so the container doesn't scroll sideways, but
    // what's inside it spills out to the right
    const spill = new DisplayComponent()
      .setWidth(20)
      .setHeight(1)
      .setContent("x".repeat(20));
    container.children()[0].setWidth(9).addChildren(spill);

    layoutAndPaint(root, canvas);

    expect(row(canvas, 0, 0, 9)).eq("x".repeat(9));
    expect(cell(canvas, 9, 0).display()).eq(THUMB);
  });
});

describe("6. between the border and the padding", () => {
  it("stays inside the border", () => {
    const { canvas, root } = screen(20, 12);
    const container = scrolling(10, 7).setBorderSize(1).addChildren(rows(20));
    root.addChildren(container);

    layoutAndPaint(root, canvas);
    show(canvas);

    // the border goes outside the 10x7 (content-box sizing): border on
    // columns 0 and 11, rows 0 and 8; content on 1..9, the bar on 10
    expect(container.contentLayout().width).eq(9);
    expect(column(canvas, 10, 1, 8)).toMatch(BAR);
    expect(column(canvas, 11, 1, 8)).not.toMatch(/[#.]/);
  });

  it("keeps the padding inside the bar", () => {
    const { canvas, root } = screen(20, 12);
    const items = rows(20);
    const container = scrolling(12, 10)
      .setPaddingVertical(1)
      .setPaddingHorizontal(1)
      .addChildren(items);
    root.addChildren(container);

    layoutAndPaint(root, canvas);

    // the padding goes outside the 12x10 (content-box sizing), so the box
    // is 14x12: padding 1, 11 of content, padding 1, the bar on column 13
    expect(container.contentLayout().x).eq(1);
    expect(container.contentLayout().width).eq(11);
    expect(items[0].layout().x).eq(1);
    expect(items[0].layout().y).eq(1);
    // the bar runs the whole height, padding rows included
    expect(column(canvas, 13, 0, 12)).toMatch(BAR);
    expect(column(canvas, 12, 0, 12)).not.toMatch(/[#.]/);
  });
});

describe("7. only there when the content doesn't fit", () => {
  it("is not there when everything fits", () => {
    const { canvas, root, container, items } = list(10, 5);

    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toBeNull();
    expect(container.horizontalScrollbar()).toBeNull();
    expect(items[0].layout().width).eq(10);
    expect(column(canvas, 9, 0, 10)).not.toMatch(/[#.]/);
  });

  it("decides each axis on its own", () => {
    const tall = list(5, 8);
    layoutAndPaint(tall.root, tall.canvas);
    expect(tall.container.verticalScrollbar()).not.toBeNull();
    expect(tall.container.horizontalScrollbar()).toBeNull();

    const wide = list(5, 2, 20);
    layoutAndPaint(wide.root, wide.canvas);
    expect(wide.container.verticalScrollbar()).toBeNull();
    expect(wide.container.horizontalScrollbar()).not.toBeNull();
  });

  it("appears when the content grows after the first frame", () => {
    const { canvas, root, container } = list(5, 3);

    layoutAndPaint(root, canvas);
    expect(container.verticalScrollbar()).toBeNull();

    container.addChildren(rows(5));
    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).not.toBeNull();
    expect(container.contentLayout().width).eq(9);
    // expect(column(canvas, 9, 0, 5)).toMatch(BAR);
  });

  it("goes away and gives the column back when the content shrinks", () => {
    const { canvas, root, container, items } = list(5, 10);

    layoutAndPaint(root, canvas);
    for (const item of items.slice(3)) {
      container.removeChild(item);
    }
    layoutAndPaint(root, canvas);

    expect(container.verticalScrollbar()).toBeNull();
    expect(items[0].layout().width).eq(10);
    expect(column(canvas, 9, 0, 5)).not.toMatch(/[#.]/);
  });

  it("is never there for overflow visible or hidden", () => {
    for (const overflow of ["visible", "hidden"] as const) {
      const { canvas, root, container } = list(5, 8, 20);
      container.setOverflow(overflow);

      layoutAndPaint(root, canvas);

      expect(container.verticalScrollbar()).toBeNull();
      expect(container.horizontalScrollbar()).toBeNull();
      expect(container.contentLayout().width).eq(10);
      expect(container.contentLayout().height).eq(5);
    }
  });
});

describe("8. both bars at once", () => {
  it("gives each bar a cell less so they don't meet in the corner", () => {
    const { canvas, root, container } = list(5, 8, 20);

    layoutAndPaint(root, canvas);
    show(canvas);

    expect(container.contentLayout().width).eq(9);
    expect(container.contentLayout().height).eq(4);
    // tracks of 4 rows and 9 columns:
    //   vertical   4 of 8 rows    -> round(4 * 4 / 8)  = 2
    //   horizontal 9 of 20 cols   -> round(9 * 9 / 20) = 4
    expect(container.verticalScrollbar()?.offset()).toEqual(0);
    expect(container.verticalScrollbar()?.size()).toEqual(2);

    expect(container.horizontalScrollbar()?.offset()).toEqual(0);
    expect(container.horizontalScrollbar()?.size()).toEqual(4);
  });

  it("keeps scrolled content out of both bars and the corner", () => {
    const { canvas, root } = screen(20, 12);
    // one block bigger than the box both ways, all "x"
    const block = new DisplayComponent()
      .setWidth(20)
      .setHeight(8)
      .setContent(Array.from({ length: 8 }, () => "x".repeat(20)).join("\n"));
    const container = scrolling(10, 5).addChildren(block);
    root.addChildren(container);

    container.setScrollTop(2).setScrollLeft(3);
    layoutAndPaint(root, canvas);
    show(canvas);

    expect(row(canvas, 0, 0, 9)).eq("x".repeat(9));
    expect(column(canvas, 9, 0, 4)).toMatch(BAR);
    expect(row(canvas, 4, 0, 9)).toMatch(BAR);
    const out = cell(canvas, 9, 4).display();
    expect(out).not.toMatch(/[#.x]/);
  });

  it("scrolls far enough to show the last row above the horizontal bar", () => {
    const { canvas, root, container, items } = list(5, 8, 20);

    container.setScrollTop(100);
    layoutAndPaint(root, canvas);

    // 4 rows visible above the bar, 8 of content
    expect(container.scrollTop()).eq(4);
    expect(items[7].layout().y).eq(3);
    expect(row(canvas, 3, 0, 5)).eq("row 7");
  });

  it("scrolls far enough to show the last column next to the vertical bar", () => {
    const { canvas, root, container } = list(5, 8, 20);

    container.setScrollLeft(100);
    layoutAndPaint(root, canvas);

    // 9 columns visible next to the bar, 20 of content
    expect(container.scrollLeft()).eq(11);
  });
});
