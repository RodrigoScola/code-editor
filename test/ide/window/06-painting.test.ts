import { describe, expect, it } from "vitest";
import colors, {
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
} from "../../../src/ui/colors.js";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import {
  brightness,
  distance,
  FakeWindow,
  Frame,
  paint,
  style,
} from "./helpers.js";

// Level 6: render() draws the canvas into the window. The window renderer
// has no cells (those are the TerminalRenderer's): a canvas point is one
// pixel, so point (x, y) of the canvas is pixel (x, y) of the window, in its
// background color. The finished pixels go to the window in one call:
//
//   window.render(width, height, width * 4, "rgba32", buffer)
//
// width x height is the whole window (pixelWidth x pixelHeight). What the
// canvas doesn't cover (it can be smaller than the window) is
// DEFAULT_BACKGROUND.
//
// The canvas is painted straight onto here (helpers paint()), so this level
// needs no editor.

const BLUE = "#2472c8";
const WHITE = "#e5e5e5";
const RED = "#cd3131";

// a renderer whose canvas is width x height pixels (its layout), in a window
// a few pixels bigger on the right and bottom
function setup(width = 4, height = 2) {
  const window = new FakeWindow(width + 5, height + 3);
  const renderer = new WindowRenderer(window).setLayout(
    LayoutBounds.Create(width, height),
  );
  // after setLayout, which makes a canvas of the layout's size
  const canvas = renderer.canvas();

  return { canvas, window, renderer };
}

describe("the frame handed to the window", () => {
  it("one render() is one window.render() call", () => {
    const { renderer, window } = setup();
    renderer.render();

    expect(window.renders).toHaveLength(1);
  });

  it("is the whole window: its pixel size, 4 bytes a pixel, rgba32", () => {
    const { renderer, window } = setup();
    renderer.render();
    const call = window.renders[0];

    expect(call.width).eq(window.pixelWidth);
    expect(call.height).eq(window.pixelHeight);
    expect(call.stride).eq(window.pixelWidth * 4);
    expect(call.format).eq("rgba32");
    expect(call.buffer.length).eq(window.pixelWidth * window.pixelHeight * 4);
  });

  it("every pixel is opaque", () => {
    const { renderer, window } = setup();
    renderer.render();
    const frame = window.lastFrame();

    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        expect(frame.rgba(x, y)[3]).eq(255);
      }
    }
  });

  it("follows the window when it is resized", () => {
    const { renderer, window } = setup();
    window.pixelWidth = 333;
    window.pixelHeight = 111;
    renderer.render();

    expect(window.lastFrame().width).eq(333);
    expect(window.lastFrame().height).eq(111);
  });

  it("a destroyed window gets nothing", () => {
    const { renderer, window } = setup();
    window.destroyed = true;
    renderer.render();

    expect(window.renders).toHaveLength(0);
  });
});

describe("backgrounds", () => {
  it("a blank canvas is DEFAULT_BACKGROUND everywhere", () => {
    const { renderer, window } = setup();
    renderer.render();
    const frame = window.lastFrame();

    expect(frame.colors(0, 0, frame.width, frame.height)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });

  it("a painted point is exactly its pixel", () => {
    const { canvas, renderer, window } = setup();
    paint(canvas, 1, 0, " ", style().setBackgroundColor(colors.BLUE));
    renderer.render();
    const frame = window.lastFrame();

    expect(frame.pixel(1, 0)).eq(BLUE);
    expect(frame.pixel(0, 0)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(2, 0)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(1, 1)).eq(DEFAULT_BACKGROUND);
  });

  it("a painted rectangle fills exactly its pixels", () => {
    const { canvas, renderer, window } = setup(10, 6);
    // x 3..6, y 2..4
    for (let y = 2; y < 5; y++) {
      paint(canvas, 3, y, "    ", style().setBackgroundColor(colors.BLUE));
    }
    renderer.render();
    const frame = window.lastFrame();

    expect(frame.colors(3, 2, 4, 3)).toEqual(new Set([BLUE]));
    // one pixel out on every side
    expect(frame.pixel(2, 2)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(7, 2)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(3, 1)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(3, 5)).eq(DEFAULT_BACKGROUND);
  });

  it("the canvas's last point is its last pixel", () => {
    const { canvas, renderer, window } = setup(4, 2);
    paint(canvas, 3, 1, " ", style().setBackgroundColor(colors.BLUE));
    renderer.render();

    expect(window.lastFrame().pixel(3, 1)).eq(BLUE);
  });

  it("a 256-color background", () => {
    const { canvas, renderer, window } = setup();
    paint(canvas, 0, 0, " ", style().setBackgroundColor(colors.ORANGE));
    renderer.render();

    expect(window.lastFrame().pixel(0, 0)).eq("#ff8700");
  });

  it("a true-color background", () => {
    const { canvas, renderer, window } = setup();
    paint(canvas, 0, 0, " ", style().setBackgroundColor("\x1b[48;2;18;52;86m"));
    renderer.render();

    expect(window.lastFrame().pixel(0, 0)).eq("#123456");
  });

  it("the pixels the canvas doesn't cover stay DEFAULT_BACKGROUND", () => {
    const { canvas, renderer, window } = setup(4, 2);
    for (let y = 0; y < 2; y++) {
      paint(canvas, 0, y, "    ", style().setBackgroundColor(colors.BLUE));
    }
    renderer.render();
    const frame = window.lastFrame();

    // right of the canvas, and below it
    expect(frame.colors(4, 0, frame.width - 4, frame.height)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
    expect(frame.colors(0, 2, frame.width, frame.height - 2)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });

  it("inverse swaps background and foreground", () => {
    const { canvas, renderer, window } = setup();
    paint(
      canvas,
      0,
      0,
      " ",
      style()
        .setBackgroundColor(colors.BLUE)
        .setColor(colors.WHITE)
        .setInverse(true),
    );
    renderer.render();

    expect(window.lastFrame().pixel(0, 0)).eq(WHITE);
  });

  it("inverse with default colors is DEFAULT_FOREGROUND (the cursor)", () => {
    const { canvas, renderer, window } = setup();
    paint(canvas, 0, 0, " ", style().setInverse(true));
    renderer.render();

    expect(window.lastFrame().pixel(0, 0)).eq(DEFAULT_FOREGROUND);
  });

  // like CSS visibility: hidden: not even its background is painted, so
  // what is under it shows through
  it("hidden text paints nothing, not even its background", () => {
    const { canvas, renderer, window } = setup();
    paint(canvas, 0, 0, " ", style().setBackgroundColor(colors.BLUE));
    paint(canvas, 0, 0, " ", style().setBackgroundColor(RED).setHidden(true));
    renderer.render();

    expect(window.lastFrame().pixel(0, 0)).eq(BLUE);
  });
});

describe("every render is a fresh frame of the canvas as it is now", () => {
  it("paint after creating the renderer, and it shows", () => {
    const { canvas, renderer, window } = setup();
    renderer.render();
    paint(canvas, 0, 0, " ", style().setBackgroundColor(colors.BLUE));
    renderer.render();

    expect(new Frame(window.renders[0]).pixel(0, 0)).eq(DEFAULT_BACKGROUND);
    expect(window.lastFrame().pixel(0, 0)).eq(BLUE);
  });

  it("a point painted back to default is default again", () => {
    const { canvas, renderer, window } = setup();
    paint(canvas, 0, 0, " ", style().setBackgroundColor(colors.BLUE));
    renderer.render();
    canvas.clear();
    renderer.render();

    expect(window.lastFrame().pixel(0, 0)).eq(DEFAULT_BACKGROUND);
  });

  it("a canvas that grew is drawn whole", () => {
    const { renderer, window } = setup(2, 1);
    window.pixelWidth = 20;
    window.pixelHeight = 10;
    renderer.setLayout(LayoutBounds.Create(6, 3));
    const canvas = renderer.canvas();
    paint(canvas, 5, 2, " ", style().setBackgroundColor(colors.BLUE));
    renderer.render();

    expect(window.lastFrame().pixel(5, 2)).eq(BLUE);
  });
});

// ---- text: skipped ----
//
// These still look for a character's ink inside a box of its own, which was
// its cell (cellWidth x cellHeight pixels). With a canvas point being one
// pixel, drawText puts one character per pixel: "abcd" would land on 4
// neighboring pixels with the glyphs drawn over each other, and "M" can't
// fit in the 1 x 1 box these look in. They need an answer to where a
// character's ink goes and where the next character starts, without cells;
// until then they are skipped. Text is anti-aliased, so they look for "ink"
// (pixels far from the background) instead of exact pixels.
function textSetup() {
  const { canvas, window, renderer } = setup();
  // a character's box: one canvas point, one pixel
  const cw = 1;
  const ch = 1;

  // the pixels of one character's box in the last frame
  const cell = (frame: Frame, column: number, row: number) =>
    frame.pixels(column * cw, row * ch, cw, ch);

  // how many pixels of a character's box are ink (far from the background)
  const ink = (
    frame: Frame,
    column: number,
    row: number,
    background = DEFAULT_BACKGROUND,
  ) =>
    cell(frame, column, row).filter((p) => distance(p, background) > 40).length;

  return { canvas, window, renderer, cw, ch, cell, ink };
}

describe("characters", () => {
  it("a character puts ink in its cell", () => {
    const { canvas, renderer, window, ink } = textSetup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE));
    renderer.render();

    window.lastFrame().show();

    expect(ink(window.lastFrame(), 0, 0)).toBeGreaterThan(0);
  });

  it("the ink stays inside its own cell", () => {
    const { canvas, renderer, window, ink } = textSetup();
    paint(canvas, 1, 0, "M", style().setColor(colors.WHITE));
    renderer.render();
    const frame = window.lastFrame();

    expect(ink(frame, 0, 0)).eq(0);
    expect(ink(frame, 2, 0)).eq(0);
    expect(ink(frame, 1, 1)).eq(0);
  });

  it("the ink is the foreground color", () => {
    const { canvas, renderer, window, cell } = textSetup();
    paint(canvas, 0, 0, "M", style().setColor(colors.RED));
    renderer.render();

    // the pixel furthest from the background is (close to) pure red
    const inkiest = cell(window.lastFrame(), 0, 0).sort(
      (a, b) =>
        distance(b, DEFAULT_BACKGROUND) - distance(a, DEFAULT_BACKGROUND),
    )[0];
    expect(distance(inkiest, RED)).toBeLessThan(40);
  });

  it("with no foreground color, the ink is DEFAULT_FOREGROUND", () => {
    const { canvas, renderer, window, cell } = textSetup();
    paint(canvas, 0, 0, "M", style());
    renderer.render();

    const inkiest = cell(window.lastFrame(), 0, 0).sort(
      (a, b) => brightness(b) - brightness(a),
    )[0];
    expect(distance(inkiest, DEFAULT_FOREGROUND)).toBeLessThan(40);
  });

  it("text sits on its cell's background", () => {
    const { canvas, renderer, window, cell } = textSetup();
    paint(
      canvas,
      0,
      0,
      "M",
      style().setBackgroundColor(colors.BLUE).setColor(colors.WHITE),
    );
    renderer.render();
    const pixels = cell(window.lastFrame(), 0, 0);

    // the corner is background; somewhere is ink
    expect(pixels[0]).eq(BLUE);
    expect(pixels.some((p) => distance(p, BLUE) > 40)).eq(true);
  });

  it("a space has no ink", () => {
    const { canvas, renderer, window, ink } = textSetup();
    paint(canvas, 0, 0, " ", style().setColor(colors.WHITE));
    renderer.render();

    expect(ink(window.lastFrame(), 0, 0)).eq(0);
  });

  it("every cell gets its own character: a word", () => {
    const { canvas, renderer, window, ink } = textSetup();
    paint(canvas, 0, 0, "abcd", style().setColor(colors.WHITE));
    renderer.render();
    const frame = window.lastFrame();

    for (let column = 0; column < 4; column++) {
      expect(ink(frame, column, 0), `cell ${column}`).toBeGreaterThan(0);
    }
  });

  it("different characters draw differently", () => {
    const { canvas, renderer, window, cell } = textSetup();
    paint(canvas, 0, 0, "il", style().setColor(colors.WHITE));
    renderer.render();
    const frame = window.lastFrame();

    expect(cell(frame, 0, 0)).not.toEqual(cell(frame, 1, 0));
  });

  it("box-drawing characters (borders) draw", () => {
    const { canvas, renderer, window, ink } = textSetup();
    paint(canvas, 0, 0, "─│┌", style().setColor(colors.WHITE));
    renderer.render();
    const frame = window.lastFrame();

    expect(ink(frame, 0, 0)).toBeGreaterThan(0);
    expect(ink(frame, 1, 0)).toBeGreaterThan(0);
    expect(ink(frame, 2, 0)).toBeGreaterThan(0);
  });
});

describe.skip("text attributes", () => {
  // the pixel rows of a cell that are ink all the way across
  function fullRows(
    pixels: string[],
    cw: number,
    background = DEFAULT_BACKGROUND,
  ) {
    const rows: number[] = [];
    for (let y = 0; y * cw < pixels.length; y++) {
      const row = pixels.slice(y * cw, (y + 1) * cw);
      if (row.every((p) => distance(p, background) > 40)) {
        rows.push(y);
      }
    }
    return rows;
  }

  it("hidden text has no ink", () => {
    const { canvas, renderer, window, ink } = textSetup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE).setHidden(true));
    renderer.render();

    expect(ink(window.lastFrame(), 0, 0)).eq(0);
  });

  it("bold has more ink than regular", () => {
    const { canvas, renderer, window, ink } = textSetup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE));
    paint(canvas, 1, 0, "M", style().setColor(colors.WHITE).setBold(true));
    renderer.render();
    const frame = window.lastFrame();

    expect(ink(frame, 1, 0)).toBeGreaterThan(ink(frame, 0, 0));
  });

  it("italic draws differently from regular", () => {
    const { canvas, renderer, window, cell } = textSetup();
    paint(canvas, 0, 0, "l", style().setColor(colors.WHITE));
    paint(canvas, 1, 0, "l", style().setColor(colors.WHITE).setItalic(true));
    renderer.render();
    const frame = window.lastFrame();

    expect(cell(frame, 1, 0)).not.toEqual(cell(frame, 0, 0));
  });

  it("dim is darker than regular", () => {
    const { canvas, renderer, window, cell } = textSetup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE));
    paint(canvas, 1, 0, "M", style().setColor(colors.WHITE).setDim(true));
    renderer.render();
    const frame = window.lastFrame();
    const brightest = (pixels: string[]) => Math.max(...pixels.map(brightness));

    expect(brightest(cell(frame, 1, 0))).toBeLessThan(
      brightest(cell(frame, 0, 0)) - 60,
    );
  });

  it("underline is a line across the whole cell, in its bottom quarter", () => {
    const { canvas, renderer, window, cell, cw, ch } = textSetup();
    paint(canvas, 0, 0, "a", style().setColor(colors.WHITE));
    paint(canvas, 1, 0, "a", style().setColor(colors.WHITE).setUnderline(true));
    renderer.render();
    const frame = window.lastFrame();
    const bottom = (rows: number[]) => rows.filter((y) => y >= ch * 0.75);

    expect(bottom(fullRows(cell(frame, 0, 0), cw))).toEqual([]);
    expect(bottom(fullRows(cell(frame, 1, 0), cw)).length).toBeGreaterThan(0);
  });

  it("an underlined space still shows the line", () => {
    const { canvas, renderer, window, cell, cw, ch } = textSetup();
    paint(canvas, 0, 0, " ", style().setColor(colors.WHITE).setUnderline(true));
    renderer.render();

    const rows = fullRows(cell(window.lastFrame(), 0, 0), cw);
    expect(rows.filter((y) => y >= ch * 0.75).length).toBeGreaterThan(0);
  });

  it("strikethrough is a line across the whole cell, in its middle third", () => {
    const { canvas, renderer, window, cell, cw, ch } = textSetup();
    paint(canvas, 0, 0, "a", style().setColor(colors.WHITE));
    paint(
      canvas,
      1,
      0,
      "a",
      style().setColor(colors.WHITE).setStrikeThrough(true),
    );
    renderer.render();
    const frame = window.lastFrame();
    const middle = (rows: number[]) =>
      rows.filter((y) => y >= ch / 3 && y < (ch * 2) / 3);

    expect(middle(fullRows(cell(frame, 0, 0), cw))).toEqual([]);
    expect(middle(fullRows(cell(frame, 1, 0), cw)).length).toBeGreaterThan(0);
  });
});
