import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { ScrollBarStyle } from "../../../../src/ui/components/Scrollbar.js";
import { TextBuffer } from "../../../../src/ui/buffer/Buffer.js";
import { cell, layoutAndPaint, screen } from "../../../helpers/ui.js";

// A component's own text is content too, like in HTML: a scrolling box
// with a long text and no children needs a bar just as much as one with
// too many children. The code editor is that case: the whole document is
// the editor's text, scrolled by its ViewPort.
//
// - scrollHeight / scrollWidth count the text: its lines (after wrapping)
//   and its longest line, plus the padding
// - the bar shows, takes its column, and isn't painted over by the text
// - the thumb follows the ViewPort (firstLine / firstColumn), which is how
//   text scrolls
//
// The children specs are in scrollbar-layout.test.ts

const THUMB = "#";
const TRACK = ".";
const BAR = /^[#.]+$/;

function lines(count: number) {
  return Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");
}

// root 20x12
// └── 10x`height`, scrolls, `text` as its own content
function textBox(height: number, text: string) {
  const { canvas, root } = screen(20, 12);
  const box = new DisplayComponent()
    .setWidth(10)
    .setHeight(height)
    .setOverflow("scroll")
    .setScrollbarStyle(ScrollBarStyle.Create().setThumb(THUMB).setTrack(TRACK))
    .setContent(text);
  root.addChildren(box);
  return { canvas, root, box };
}

type Canvas = ReturnType<typeof screen>["canvas"];

function column(canvas: Canvas, x: number, from: number, to: number) {
  let out = "";
  for (let y = from; y < to; y++) {
    out += cell(canvas, x, y).display();
  }
  return out;
}

describe("scroll size of a component's text", () => {
  it("counts the lines of the text in scrollHeight", () => {
    const { canvas, root, box } = textBox(5, lines(20));

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(20);
  });

  it("counts the longest line in scrollWidth", () => {
    const { canvas, root, box } = textBox(5, "short\n" + "x".repeat(30));
    box.setTextOverflow("visible");

    layoutAndPaint(root, canvas);

    expect(box.scrollWidth()).eq(30);
  });

  it("counts wrapped lines as the rows they take", () => {
    // 3 lines of 18, wrapped at the 9 columns left next to the bar: 6 rows
    const text = Array.from({ length: 3 }, () => "y".repeat(18)).join("\n");
    const { canvas, root, box } = textBox(4, text);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(6);
    expect(box.verticalScrollbar()).not.toBeNull();
    expect(box.horizontalScrollbar()).toBeNull();
  });

  it("adds the padding, like it does for children", () => {
    const { canvas, root, box } = textBox(5, lines(20));
    box.setPaddingVertical(1);

    layoutAndPaint(root, canvas);

    expect(box.scrollHeight()).eq(22);
  });
});

describe("a bar for a component's text", () => {
  it("shows the vertical bar when the text is too tall", () => {
    const { canvas, root, box } = textBox(5, lines(20));

    layoutAndPaint(root, canvas);

    expect(box.verticalScrollbar()).not.toBeNull();
    expect(box.contentLayout().width).eq(9);
    expect(column(canvas, 9, 0, 5)).toMatch(BAR);
  });

  it("shows the horizontal bar when an unwrapped line is too wide", () => {
    const { canvas, root, box } = textBox(5, "x".repeat(30));
    box.setTextOverflow("visible");

    layoutAndPaint(root, canvas);

    expect(box.horizontalScrollbar()).not.toBeNull();
    expect(box.contentLayout().height).eq(4);
  });

  it("is not there when the text fits", () => {
    const { canvas, root, box } = textBox(5, lines(3));

    layoutAndPaint(root, canvas);

    expect(box.verticalScrollbar()).toBeNull();
    expect(box.horizontalScrollbar()).toBeNull();
  });

  it("does not let the text paint over the bar", () => {
    const { canvas, root } = textBox(5, "x".repeat(30) + "\n" + lines(20));

    layoutAndPaint(root, canvas);

    // the first line wraps at 9 columns; column 9 is the bar's
    expect(cell(canvas, 8, 0).display()).eq("x");
    expect(cell(canvas, 9, 0).display()).toMatch(/[#.]/);
  });

  it("appears when a longer buffer is set after the first frame", () => {
    // what CodeEditorWindow.openDocument does
    const { canvas, root, box } = textBox(5, lines(2));

    layoutAndPaint(root, canvas);
    expect(box.verticalScrollbar()).toBeNull();

    box.content().setBuffer(new TextBuffer(lines(20)));
    layoutAndPaint(root, canvas);

    expect(box.verticalScrollbar()).not.toBeNull();
  });
});

describe("the thumb follows the ViewPort", () => {
  it("is at the top when the ViewPort is at the first line", () => {
    const { canvas, root, box } = textBox(5, lines(20));

    layoutAndPaint(root, canvas);

    // 5 of 20 rows -> round(5 * 5 / 20) = 1
    expect(box.verticalScrollbar()?.offset()).eq(0);
    expect(box.verticalScrollbar()?.size()).eq(1);
  });

  it("moves down with viewport().firstLine", () => {
    const { canvas, root, box } = textBox(5, lines(20));

    layoutAndPaint(root, canvas);
    // the editor's cursor moves the ViewPort, not scrollTop
    box.viewport().firstLine = 15;
    box.setDirty(true);
    layoutAndPaint(root, canvas);

    // scrolled to the end: the thumb is at the end of the 5 row track
    expect(box.verticalScrollbar()?.offset()).eq(4);
    expect(column(canvas, 9, 0, 5)).eq("....#");
  });

  it("moves right with viewport().firstColumn", () => {
    const { canvas, root, box } = textBox(5, "x".repeat(30));
    box.setTextOverflow("visible");

    layoutAndPaint(root, canvas);
    box.viewport().firstColumn = 20;
    box.setDirty(true);
    layoutAndPaint(root, canvas);

    // 10 of 30 columns -> thumb 3 of the 10 column track, at the end
    expect(box.horizontalScrollbar()?.size()).eq(3);
    expect(box.horizontalScrollbar()?.offset()).eq(7);
  });
});
