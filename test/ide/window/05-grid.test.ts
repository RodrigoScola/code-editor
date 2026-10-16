import { describe, expect, it } from "vitest";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { cellCanvas, FakeWindow } from "./helpers.js";

// Level 5: the grid. The editor lays out in cells; the window has pixels.
// Every cell is cellWidth() x cellHeight() pixels, measured once from the
// font (a monospace font, so every character has the same width), and the
// window fits gridSize() of them.
//
//   new WindowRenderer(canvas, window)
//     canvas: the cell canvas (src/ui/canvas.ts) the editor paints into
//     window: anything shaped like an SDL window, PixelWindow:
//       { pixelWidth, pixelHeight, destroyed, render(...), on(...), destroy() }
//     The specs pass a FakeWindow (helpers.ts); WindowRenderer.Open(canvas)
//     makes a real one (level 10).
//
// Also the parts of the Renderer interface (src/ui/TerminalRenderer.ts) that
// don't draw: layout(), setLayout(), isTerminalRenderer(), isWindowRenderer().
// Nothing is drawn yet in this level.

function renderer(window = new FakeWindow(), canvas = cellCanvas(4, 2)) {
  return new WindowRenderer(canvas, window);
}

describe("cell size", () => {
  it("cellWidth() is a whole number of pixels, more than 0", () => {
    const width = renderer().cellWidth();

    expect(Number.isInteger(width)).eq(true);
    expect(width).toBeGreaterThan(0);
  });

  it("cellHeight() is a whole number of pixels, more than 0", () => {
    const height = renderer().cellHeight();

    expect(Number.isInteger(height)).eq(true);
    expect(height).toBeGreaterThan(0);
  });

  it("cells are taller than they are wide, like a terminal's", () => {
    const r = renderer();
    expect(r.cellHeight()).toBeGreaterThan(r.cellWidth());
  });

  it("the size comes from the font, not the window: every renderer has the same", () => {
    const small = renderer(new FakeWindow(10, 10));
    const large = renderer(new FakeWindow(2000, 1000));

    expect(small.cellWidth()).eq(large.cellWidth());
    expect(small.cellHeight()).eq(large.cellHeight());
  });
});

describe("gridSize(): how many cells fit in the window", () => {
  it("is the window's pixels divided by the cell size", () => {
    const r = renderer();
    const window = new FakeWindow(r.cellWidth() * 80, r.cellHeight() * 24);

    expect(renderer(window).gridSize()).toEqual({ columns: 80, rows: 24 });
  });

  it("a cell that only partly fits doesn't count (rounds down)", () => {
    const r = renderer();
    const window = new FakeWindow(
      r.cellWidth() * 80 + r.cellWidth() - 1,
      r.cellHeight() * 24 + r.cellHeight() - 1,
    );

    expect(renderer(window).gridSize()).toEqual({ columns: 80, rows: 24 });
  });

  it("is at least 1 x 1, even for a window smaller than a cell", () => {
    expect(renderer(new FakeWindow(1, 1)).gridSize()).toEqual({
      columns: 1,
      rows: 1,
    });
  });

  it("follows the window's size as it changes, without being told", () => {
    const window = new FakeWindow(100, 100);
    const r = renderer(window);

    window.pixelWidth = r.cellWidth() * 30;
    window.pixelHeight = r.cellHeight() * 10;

    expect(r.gridSize()).toEqual({ columns: 30, rows: 10 });
  });

  it("doesn't depend on the canvas's size", () => {
    const window = new FakeWindow(400, 200);
    const a = renderer(window, cellCanvas(1, 1));
    const b = renderer(window, cellCanvas(200, 100));

    expect(a.gridSize()).toEqual(b.gridSize());
  });
});

describe("the Renderer interface, without drawing", () => {
  it("canvas() is the cell canvas it was given", () => {
    const canvas = cellCanvas(4, 2);
    expect(renderer(new FakeWindow(), canvas).canvas()).toBe(canvas);
  });

  it("layout() is the canvas's layout", () => {
    const r = renderer(new FakeWindow(), cellCanvas(7, 3));

    expect(r.layout().width).eq(7);
    expect(r.layout().height).eq(3);
  });

  it("setLayout() resizes the cell canvas and returns the renderer", () => {
    const r = renderer();

    expect(r.setLayout(LayoutBounds.Create(12, 5))).toBe(r);
    expect(r.layout().width).eq(12);
    expect(r.layout().height).eq(5);
    expect(r.canvas().getCells()).toHaveLength(5);
    expect(r.canvas().getCells()[0]).toHaveLength(12);
  });

  it("isWindowRenderer() is true", () => {
    expect(renderer().isWindowRenderer()).eq(true);
  });

  it("isTerminalRenderer() is false", () => {
    expect(renderer().isTerminalRenderer()).eq(false);
  });

  it("creating it doesn't draw anything", () => {
    const window = new FakeWindow();
    renderer(window);

    expect(window.renders).toHaveLength(0);
  });
});
