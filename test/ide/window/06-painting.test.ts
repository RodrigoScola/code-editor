import { describe, expect, it } from "vitest";
import colors from "../../../src/ui/colors.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
} from "../../../src/ui/Renderers/ansiColors.js";
import {
  brightness,
  cellCanvas,
  distance,
  FakeWindow,
  Frame,
  paint,
  style,
} from "./helpers.js";

// Level 6: render() draws the cell canvas into the window. Every cell is a
// rectangle of its background color with its character on it in its
// foreground color (Canvas 2D: @napi-rs/canvas), and the finished pixels go
// to the window in one call:
//
//   window.render(width, height, width * 4, "rgba32", buffer)
//
// width x height is the whole window (pixelWidth x pixelHeight). Cell
// (column, row) covers pixels column*cellWidth .. (column+1)*cellWidth - 1
// across and row*cellHeight .. (row+1)*cellHeight - 1 down. What the cells
// don't cover (the window isn't a whole number of cells) is
// DEFAULT_BACKGROUND.
//
// The cells are painted straight onto the canvas here (helpers paint()), so
// this level needs no editor. Text is anti-aliased, so text specs look for
// "ink" (pixels far from the background) instead of exact pixels.

const BLUE = "#2472c8";
const WHITE = "#e5e5e5";
const RED = "#cd3131";

// a renderer over a columns x rows canvas in a window that fits it plus a
// few spare pixels on the right and bottom
function setup(columns = 4, rows = 2) {
  const canvas = cellCanvas(columns, rows);
  const probe = new WindowRenderer(cellCanvas(1, 1), new FakeWindow());
  const window = new FakeWindow(
    columns * probe.cellWidth() + 5,
    rows * probe.cellHeight() + 3,
  );
  const renderer = new WindowRenderer(canvas, window);
  const cw = renderer.cellWidth();
  const ch = renderer.cellHeight();

  // the pixels of one cell in the last frame
  const cell = (frame: Frame, column: number, row: number) =>
    frame.pixels(column * cw, row * ch, cw, ch);

  // how many pixels of a cell are ink (far from the background)
  const ink = (frame: Frame, column: number, row: number, background = DEFAULT_BACKGROUND) =>
    cell(frame, column, row).filter((p) => distance(p, background) > 40).length;

  return { canvas, window, renderer, cw, ch, cell, ink };
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

  it("a cell's background fills exactly its rectangle", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 1, 0, " ", style().setBackgroundColor(colors.BLUE_BACKGROUND));
    renderer.render();
    const frame = window.lastFrame();

    expect(new Set(cell(frame, 1, 0))).toEqual(new Set([BLUE]));
    expect(new Set(cell(frame, 0, 0))).toEqual(new Set([DEFAULT_BACKGROUND]));
    expect(new Set(cell(frame, 2, 0))).toEqual(new Set([DEFAULT_BACKGROUND]));
    expect(new Set(cell(frame, 1, 1))).toEqual(new Set([DEFAULT_BACKGROUND]));
  });

  it("a cell in the last row and column is where the grid says", () => {
    const { canvas, renderer, window, cell } = setup(4, 2);
    paint(canvas, 3, 1, " ", style().setBackgroundColor(colors.BLUE_BACKGROUND));
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 3, 1))).toEqual(new Set([BLUE]));
  });

  it("a 256-color background", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, " ", style().setBackgroundColor(colors.ORANGE_BACKGROUND));
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 0, 0))).toEqual(new Set(["#ff8700"]));
  });

  it("a true-color background", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, " ", style().setBackgroundColor("\x1b[48;2;18;52;86m"));
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 0, 0))).toEqual(new Set(["#123456"]));
  });

  it("the strip the cells don't cover stays DEFAULT_BACKGROUND", () => {
    const { canvas, renderer, window, cw, ch } = setup(4, 2);
    for (let row = 0; row < 2; row++) {
      paint(canvas, 0, row, "    ", style().setBackgroundColor(colors.BLUE_BACKGROUND));
    }
    renderer.render();
    const frame = window.lastFrame();

    // right of the last column, and below the last row
    expect(frame.colors(4 * cw, 0, frame.width - 4 * cw, frame.height)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
    expect(frame.colors(0, 2 * ch, frame.width, frame.height - 2 * ch)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });
});

describe("every render is a fresh frame of the canvas as it is now", () => {
  it("paint after creating the renderer, and it shows", () => {
    const { canvas, renderer, window, cell } = setup();
    renderer.render();
    paint(canvas, 0, 0, " ", style().setBackgroundColor(colors.BLUE_BACKGROUND));
    renderer.render();

    expect(new Set(cell(new Frame(window.renders[0]), 0, 0))).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
    expect(new Set(cell(window.lastFrame(), 0, 0))).toEqual(new Set([BLUE]));
  });

  it("a cell painted back to default is default again", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, " ", style().setBackgroundColor(colors.BLUE_BACKGROUND));
    renderer.render();
    canvas.clear();
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 0, 0))).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });

  it("a canvas that grew is drawn whole", () => {
    const { renderer, window, cell } = setup(2, 1);
    window.pixelWidth = 1000;
    window.pixelHeight = 500;
    const canvas = renderer.canvas();
    canvas.setWidth(6);
    canvas.setHeight(3);
    paint(canvas, 5, 2, " ", style().setBackgroundColor(colors.BLUE_BACKGROUND));
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 5, 2))).toEqual(new Set([BLUE]));
  });
});

describe("characters", () => {
  it("a character puts ink in its cell", () => {
    const { canvas, renderer, window, ink } = setup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE_FOREGROUND));
    renderer.render();

    expect(ink(window.lastFrame(), 0, 0)).toBeGreaterThan(0);
  });

  it("the ink stays inside its own cell", () => {
    const { canvas, renderer, window, ink } = setup();
    paint(canvas, 1, 0, "M", style().setColor(colors.WHITE_FOREGROUND));
    renderer.render();
    const frame = window.lastFrame();

    expect(ink(frame, 0, 0)).eq(0);
    expect(ink(frame, 2, 0)).eq(0);
    expect(ink(frame, 1, 1)).eq(0);
  });

  it("the ink is the foreground color", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, "M", style().setColor(colors.RED_FOREGROUND));
    renderer.render();

    // the pixel furthest from the background is (close to) pure red
    const inkiest = cell(window.lastFrame(), 0, 0).sort(
      (a, b) => distance(b, DEFAULT_BACKGROUND) - distance(a, DEFAULT_BACKGROUND),
    )[0];
    expect(distance(inkiest, RED)).toBeLessThan(40);
  });

  it("with no foreground color, the ink is DEFAULT_FOREGROUND", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, "M", style());
    renderer.render();

    const inkiest = cell(window.lastFrame(), 0, 0).sort(
      (a, b) => brightness(b) - brightness(a),
    )[0];
    expect(distance(inkiest, DEFAULT_FOREGROUND)).toBeLessThan(40);
  });

  it("text sits on its cell's background", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(
      canvas,
      0,
      0,
      "M",
      style()
        .setBackgroundColor(colors.BLUE_BACKGROUND)
        .setColor(colors.WHITE_FOREGROUND),
    );
    renderer.render();
    const pixels = cell(window.lastFrame(), 0, 0);

    // the corner is background; somewhere is ink
    expect(pixels[0]).eq(BLUE);
    expect(pixels.some((p) => distance(p, BLUE) > 40)).eq(true);
  });

  it("a space has no ink", () => {
    const { canvas, renderer, window, ink } = setup();
    paint(canvas, 0, 0, " ", style().setColor(colors.WHITE_FOREGROUND));
    renderer.render();

    expect(ink(window.lastFrame(), 0, 0)).eq(0);
  });

  it("every cell gets its own character: a word", () => {
    const { canvas, renderer, window, ink } = setup();
    paint(canvas, 0, 0, "abcd", style().setColor(colors.WHITE_FOREGROUND));
    renderer.render();
    const frame = window.lastFrame();

    for (let column = 0; column < 4; column++) {
      expect(ink(frame, column, 0), `cell ${column}`).toBeGreaterThan(0);
    }
  });

  it("different characters draw differently", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, "il", style().setColor(colors.WHITE_FOREGROUND));
    renderer.render();
    const frame = window.lastFrame();

    expect(cell(frame, 0, 0)).not.toEqual(cell(frame, 1, 0));
  });

  it("box-drawing characters (borders) draw", () => {
    const { canvas, renderer, window, ink } = setup();
    paint(canvas, 0, 0, "─│┌", style().setColor(colors.WHITE_FOREGROUND));
    renderer.render();
    const frame = window.lastFrame();

    expect(ink(frame, 0, 0)).toBeGreaterThan(0);
    expect(ink(frame, 1, 0)).toBeGreaterThan(0);
    expect(ink(frame, 2, 0)).toBeGreaterThan(0);
  });
});

describe("text attributes", () => {
  // the pixel rows of a cell that are ink all the way across
  function fullRows(pixels: string[], cw: number, background = DEFAULT_BACKGROUND) {
    const rows: number[] = [];
    for (let y = 0; y * cw < pixels.length; y++) {
      const row = pixels.slice(y * cw, (y + 1) * cw);
      if (row.every((p) => distance(p, background) > 40)) {
        rows.push(y);
      }
    }
    return rows;
  }

  it("inverse swaps background and foreground", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(
      canvas,
      0,
      0,
      " ",
      style()
        .setBackgroundColor(colors.BLUE_BACKGROUND)
        .setColor(colors.WHITE_FOREGROUND)
        .setInverse(true),
    );
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 0, 0))).toEqual(new Set([WHITE]));
  });

  it("inverse with default colors is a DEFAULT_FOREGROUND block (the cursor)", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, " ", style().setInverse(true));
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 0, 0))).toEqual(
      new Set([DEFAULT_FOREGROUND]),
    );
  });

  it("hidden text has no ink", () => {
    const { canvas, renderer, window, ink } = setup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE_FOREGROUND).setHidden(true));
    renderer.render();

    expect(ink(window.lastFrame(), 0, 0)).eq(0);
  });

  it("hidden text still has its background", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(
      canvas,
      0,
      0,
      "M",
      style().setBackgroundColor(colors.BLUE_BACKGROUND).setHidden(true),
    );
    renderer.render();

    expect(new Set(cell(window.lastFrame(), 0, 0))).toEqual(new Set([BLUE]));
  });

  it("bold has more ink than regular", () => {
    const { canvas, renderer, window, ink } = setup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE_FOREGROUND));
    paint(canvas, 1, 0, "M", style().setColor(colors.WHITE_FOREGROUND).setBold(true));
    renderer.render();
    const frame = window.lastFrame();

    expect(ink(frame, 1, 0)).toBeGreaterThan(ink(frame, 0, 0));
  });

  it("italic draws differently from regular", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, "l", style().setColor(colors.WHITE_FOREGROUND));
    paint(canvas, 1, 0, "l", style().setColor(colors.WHITE_FOREGROUND).setItalic(true));
    renderer.render();
    const frame = window.lastFrame();

    expect(cell(frame, 1, 0)).not.toEqual(cell(frame, 0, 0));
  });

  it("dim is darker than regular", () => {
    const { canvas, renderer, window, cell } = setup();
    paint(canvas, 0, 0, "M", style().setColor(colors.WHITE_FOREGROUND));
    paint(canvas, 1, 0, "M", style().setColor(colors.WHITE_FOREGROUND).setDim(true));
    renderer.render();
    const frame = window.lastFrame();
    const brightest = (pixels: string[]) => Math.max(...pixels.map(brightness));

    expect(brightest(cell(frame, 1, 0))).toBeLessThan(
      brightest(cell(frame, 0, 0)) - 60,
    );
  });

  it("underline is a line across the whole cell, in its bottom quarter", () => {
    const { canvas, renderer, window, cell, cw, ch } = setup();
    paint(canvas, 0, 0, "a", style().setColor(colors.WHITE_FOREGROUND));
    paint(canvas, 1, 0, "a", style().setColor(colors.WHITE_FOREGROUND).setUnderline(true));
    renderer.render();
    const frame = window.lastFrame();
    const bottom = (rows: number[]) => rows.filter((y) => y >= ch * 0.75);

    expect(bottom(fullRows(cell(frame, 0, 0), cw))).toEqual([]);
    expect(bottom(fullRows(cell(frame, 1, 0), cw)).length).toBeGreaterThan(0);
  });

  it("an underlined space still shows the line", () => {
    const { canvas, renderer, window, cell, cw, ch } = setup();
    paint(canvas, 0, 0, " ", style().setColor(colors.WHITE_FOREGROUND).setUnderline(true));
    renderer.render();

    const rows = fullRows(cell(window.lastFrame(), 0, 0), cw);
    expect(rows.filter((y) => y >= ch * 0.75).length).toBeGreaterThan(0);
  });

  it("strikethrough is a line across the whole cell, in its middle third", () => {
    const { canvas, renderer, window, cell, cw, ch } = setup();
    paint(canvas, 0, 0, "a", style().setColor(colors.WHITE_FOREGROUND));
    paint(
      canvas,
      1,
      0,
      "a",
      style().setColor(colors.WHITE_FOREGROUND).setStrikeThrough(true),
    );
    renderer.render();
    const frame = window.lastFrame();
    const middle = (rows: number[]) =>
      rows.filter((y) => y >= ch / 3 && y < (ch * 2) / 3);

    expect(middle(fullRows(cell(frame, 0, 0), cw))).toEqual([]);
    expect(middle(fullRows(cell(frame, 1, 0), cw)).length).toBeGreaterThan(0);
  });
});
