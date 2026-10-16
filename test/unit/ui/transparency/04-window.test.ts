import { expect, it } from "vitest";
import { cells, fill, later, style, windowFor, write } from "./helpers.js";

// Level 4: the same in the native window (test/ide/window, levels 5-6 there
// first). Parked: see helpers.ts.
//
// The window draws pixels, so it could blend for real. But the cells are
// the same cells the terminal gets, already blended on the canvas, so the
// window paints the same colors the terminal shows. A cell still holding a
// see-through color is blended with the window's own background,
// DEFAULT_BACKGROUND ("#1e1e1e"), which the window knows for sure; that is
// also the terminal's default assumption (level 3), so both look the same.

const CORNER = (renderer: any, column: number, row: number) => ({
  x: column * renderer.cellWidth(),
  y: row * renderer.cellHeight(),
});

// the pixel at a cell's top-left corner, where no character ink reaches
async function cornerColor(
  canvas: ReturnType<typeof cells>,
  column = 0,
  row = 0,
) {
  const { renderer, window } = await windowFor(canvas);
  renderer.render();
  const { x, y } = CORNER(renderer, column, row);
  return window.lastFrame().pixel(x, y);
}

later("4. see-through backgrounds in the window", () => {
  it("a blended cell is painted in its blended color", async () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));

    expect(await cornerColor(canvas)).eq("#808080");
  });

  it("every pixel of the cell, not only the corner", async () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#2472c8"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(0, 0, 0, 0.5)"));
    const { renderer, window } = await windowFor(canvas);
    renderer.render();

    expect(
      window
        .lastFrame()
        .colors(0, 0, renderer.cellWidth(), renderer.cellHeight()),
    ).toEqual(new Set(["#123964"]));
  });

  it("see-through over the window's own background blends with #1e1e1e", async () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));

    expect(await cornerColor(canvas)).eq("#8f8f8f");
  });

  it("a fully transparent cell is the window's own background", async () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("transparent"));

    expect(await cornerColor(canvas)).eq("#1e1e1e");
  });

  it("every pixel is still opaque", async () => {
    const canvas = cells(2);
    fill(canvas, 0, 0, 2, 1, style().setBackgroundColor("rgba(255, 0, 0, 0.3)"));
    const { renderer, window } = await windowFor(canvas);
    renderer.render();
    const frame = window.lastFrame();

    for (let x = 0; x < 2 * renderer.cellWidth(); x++) {
      expect(frame.rgba(x, 0)[3]).eq(255);
    }
  });
});

later("4. see-through text in the window", () => {
  // the pixel of a cell furthest from its background: the character's ink
  async function inkiest(canvas: ReturnType<typeof cells>, background: string) {
    const { renderer, window } = await windowFor(canvas);
    renderer.render();
    const { distance } = await import("../../../ide/window/helpers.js");
    return window
      .lastFrame()
      .pixels(0, 0, renderer.cellWidth(), renderer.cellHeight())
      .sort((a: string, b: string) => distance(b, background) - distance(a, background))[0];
  }

  it("half white text on black draws gray ink", async () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    write(canvas, 0, 0, "M", style().setColor("rgba(255, 255, 255, 0.5)"));
    const { distance } = await import("../../../ide/window/helpers.js");

    expect(distance(await inkiest(canvas, "#000000"), "#808080")).toBeLessThan(40);
  });

  it("a backdrop over text leaves the text readable, tinted", async () => {
    const canvas = cells(1);
    write(
      canvas,
      0,
      0,
      "M",
      style().setBackgroundColor("#2472c8").setColor("#ffffff"),
    );
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(0, 0, 0, 0.5)"));
    const { distance } = await import("../../../ide/window/helpers.js");
    const ink = await inkiest(canvas, "#123964");

    // the ink is the tinted text color, clearly apart from the background
    expect(distance(ink, "#808080")).toBeLessThan(40);
    expect(distance(ink, "#123964")).toBeGreaterThan(60);
  });
});
