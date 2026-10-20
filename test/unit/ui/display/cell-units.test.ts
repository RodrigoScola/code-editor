import { afterEach, describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";

// Cells: a plain number in a size means characters, on the terminal and in a
// window alike, like CSS's ch and lh. The layout turns it into pixels in one
// place:
//
//   horizontal (width, maxWidth, left/right padding, margin and border, the
//   gap in a row)       n * charWidth()
//   vertical (height, maxHeight, top/bottom padding, margin and border, the
//   gap in a column)    n * lineHeight()
//
// On the terminal both are 1, so nothing changes there. In a window they come
// from the font: lineHeight() is the font size (ComponentStyle.FontSize, 16
// once a WindowCanvas exists), charWidth() the font size times
// ComponentStyle.CharAdvance (a WindowCanvas measures it from the font; these
// specs set 0.5, so a character is 8 pixels and the numbers stay whole).
//
// Everything else is not scaled:
//   "50%"            of the parent, which is pixels already
//   "4px"            pixels, as they are
//   "auto",
//   "fit-content"    the content, measured in pixels already (text is
//                    characters * charWidth by lines * lineHeight)
//
// A border is one cell, like on the terminal: in a window, a left border is
// charWidth wide and a top one lineHeight tall.
//
//   type Size = number | `${number}%` | `${number}px` | "auto" | "fit-content"
//
// and padding, margin and gap take a Size too (setPaddingLeft("4px")).

const CH = 8; // charWidth() in a window: 16 * 0.5
const LH = 16; // lineHeight() in a window

// a window's font for one spec
function inWindow() {
  ComponentStyle.FontSize = 16;
  ComponentStyle.CharAdvance = 0.5;
}
const charAdvance = ComponentStyle.CharAdvance;
afterEach(() => {
  ComponentStyle.FontSize = 1;
  ComponentStyle.CharAdvance = charAdvance;
});

// a root of width x height pixels (or cells, on the terminal) holding child
function laidOut(
  child: DisplayComponent,
  width = 800,
  height = 400,
  direction: "horizontal" | "vertical" = "vertical",
) {
  const root = new DisplayComponent()
    .setDirection(direction)
    .setLayout(LayoutEngine.CreateBounds(width, height));
  root.addChildren(child);

  LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(width, height));
  LayoutEngine.Arrange(root);
  return root;
}

function box(width: Size = 3, height: Size = 2) {
  return new DisplayComponent().setWidth(width).setHeight(height);
}

describe("charWidth() and lineHeight()", () => {
  it("are 1 on the terminal", () => {
    const c = new DisplayComponent();

    expect(c.charWidth()).eq(1);
    expect(c.lineHeight()).eq(1);
  });

  it("come from the font size in a window", () => {
    inWindow();
    const c = new DisplayComponent();

    expect(c.charWidth()).eq(CH);
    expect(c.lineHeight()).eq(LH);
  });
});

describe("width and height in cells", () => {
  it("a width is characters wide", () => {
    inWindow();
    const c = box(30, 1);
    laidOut(c);

    expect(c.layout().width).eq(30 * CH);
  });

  it("a height is lines tall", () => {
    inWindow();
    const c = box(1, 3);
    laidOut(c);

    expect(c.layout().height).eq(3 * LH);
  });

  it("maxWidth is characters too", () => {
    inWindow();
    const c = box(30, 1).setMaxWidth(20);
    laidOut(c);

    expect(c.layout().width).eq(20 * CH);
  });

  it("maxHeight is lines too", () => {
    inWindow();
    const c = box(1, 10).setMaxHeight(4);
    laidOut(c);

    expect(c.layout().height).eq(4 * LH);
  });

  it("measure() agrees with the layout", () => {
    inWindow();
    const c = box(30, 2);

    const size = c.measure(LayoutEngine.CreateConstraints(800, 400));
    expect(size.width).eq(30 * CH);
    expect(size.height).eq(2 * LH);
  });
});

describe("what is not scaled", () => {
  it("a percentage is of the parent's pixels", () => {
    inWindow();
    const c = box("50%", "25%");
    laidOut(c, 800, 400);

    expect(c.layout().width).eq(400);
    expect(c.layout().height).eq(100);
  });

  it("px is pixels", () => {
    inWindow();
    const c = box("37px", "5px");
    laidOut(c);

    expect(c.layout().width).eq(37);
    expect(c.layout().height).eq(5);
  });

  it("px works for maxWidth", () => {
    inWindow();
    const c = box(30, 1).setMaxWidth("100px");
    laidOut(c);

    expect(c.layout().width).eq(100);
  });

  it("fit-content text is its characters and lines", () => {
    inWindow();
    const c = new DisplayComponent()
      .setWidth("fit-content")
      .setHeight("fit-content")
      .setContent("abcd\nef");
    laidOut(c);

    expect(c.layout().width).eq(4 * CH);
    expect(c.layout().height).eq(2 * LH);
  });

  it("an auto size fits its text the same way", () => {
    inWindow();
    const c = new DisplayComponent().setContent("abc");
    laidOut(c, 800, 400, "horizontal");

    expect(c.layout().width).eq(3 * CH);
  });
});

describe("padding in cells", () => {
  it("left and right padding are characters", () => {
    inWindow();
    const c = box(10, 1).setPaddingHorizontal(2);
    laidOut(c);

    expect(c.layout().width).eq(10 * CH + 2 * 2 * CH);
    expect(c.contentLayout().x - c.layout().x).eq(2 * CH);
    expect(c.contentLayout().width).eq(10 * CH);
  });

  it("top and bottom padding are lines", () => {
    inWindow();
    const c = box(10, 1).setPaddingVertical(1);
    laidOut(c);

    expect(c.layout().height).eq(1 * LH + 2 * LH);
    expect(c.contentLayout().y - c.layout().y).eq(LH);
  });

  it("px padding is pixels", () => {
    inWindow();
    const c = box(10, 1).setPaddingLeft("4px");
    laidOut(c);

    expect(c.contentLayout().x - c.layout().x).eq(4);
  });

  it("a percentage padding is of the parent's width, like CSS", () => {
    inWindow();
    const c = box(10, 1).setPaddingLeft("10%");
    laidOut(c, 800, 400);

    expect(c.contentLayout().x - c.layout().x).eq(80);
  });
});

describe("margin in cells", () => {
  it("a left margin is characters", () => {
    inWindow();
    const c = box(10, 1).setMarginLeft(3);
    laidOut(c);

    expect(c.layout().x).eq(3 * CH);
  });

  it("a top margin is lines", () => {
    inWindow();
    const c = box(10, 1).setMarginTop(2);
    laidOut(c);

    expect(c.layout().y).eq(2 * LH);
  });

  it("px margin is pixels", () => {
    inWindow();
    const c = box(10, 1).setMarginLeft("6px");
    laidOut(c);

    expect(c.layout().x).eq(6);
  });
});

describe("gap in cells", () => {
  function three(direction: "horizontal" | "vertical", gap: Size) {
    const parent = new DisplayComponent()
      .setDirection(direction)
      .setGap(gap);
    const kids = [box(2, 1), box(2, 1), box(2, 1)];
    parent.addChildren(kids);
    laidOut(parent);
    return kids;
  }

  it("in a row, the gap is characters", () => {
    inWindow();
    const kids = three("horizontal", 1);

    expect(kids.map((k) => k.layout().x)).toEqual([0, 3 * CH, 6 * CH]);
  });

  it("in a column, the gap is lines", () => {
    inWindow();
    const kids = three("vertical", 1);

    expect(kids.map((k) => k.layout().y)).toEqual([0, 2 * LH, 4 * LH]);
  });

  it("px gap is pixels", () => {
    inWindow();
    const kids = three("horizontal", "5px");

    expect(kids.map((k) => k.layout().x)).toEqual([0, 2 * CH + 5, 4 * CH + 10]);
  });
});

describe("a border is one cell", () => {
  it("left and right borders are a character wide", () => {
    inWindow();
    const c = box(10, 1).setBorderLeft(1).setBorderRight(1);
    laidOut(c);

    expect(c.layout().width).eq(10 * CH + 2 * CH);
    expect(c.contentLayout().x - c.layout().x).eq(CH);
  });

  it("top and bottom borders are a line tall", () => {
    inWindow();
    const c = box(10, 1).setBorderTop(1).setBorderBottom(1);
    laidOut(c);

    expect(c.layout().height).eq(LH + 2 * LH);
    expect(c.contentLayout().y - c.layout().y).eq(LH);
  });
});

describe("the terminal is unchanged", () => {
  it("a number is cells", () => {
    const c = box(30, 3).setMaxWidth(20);
    laidOut(c, 80, 24);

    expect(c.layout().width).eq(20);
    expect(c.layout().height).eq(3);
  });

  it("padding, margin and border are cells", () => {
    const c = box(10, 1)
      .setPaddingHorizontal(2)
      .setMarginLeft(3)
      .setBorderLeft(1);
    laidOut(c, 80, 24);

    expect(c.layout().x).eq(3);
    expect(c.contentLayout().x - c.layout().x).eq(1 + 2);
  });

  it("a gap is cells", () => {
    const parent = new DisplayComponent().setDirection("horizontal").setGap(1);
    const kids = [box(2, 1), box(2, 1)];
    parent.addChildren(kids);
    laidOut(parent, 80, 24);

    expect(kids.map((k) => k.layout().x)).toEqual([0, 3]);
  });

  it("a percentage is of the parent", () => {
    const c = box("50%", 1);
    laidOut(c, 80, 24);

    expect(c.layout().width).eq(40);
  });

  it("px is a cell each, since a cell is the terminal's pixel", () => {
    const c = box("7px", 1);
    laidOut(c, 80, 24);

    expect(c.layout().width).eq(7);
  });
});
