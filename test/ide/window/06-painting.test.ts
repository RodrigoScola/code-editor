import { describe, expect, it } from "vitest";
import colors, {
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
} from "../../../src/ui/colors.js";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { distance, FakeWindow, Frame, paint, style } from "./helpers.js";

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

// How text itself is drawn (ink, colors, bold, italic, dim, underline,
// strikethrough, borders) is WindowCanvas's job, tested pixel by pixel in
// test/unit/ui/rendering/window-canvas.test.ts. Here: that it reaches the
// window.
describe("text", () => {
  it("text drawn on the canvas reaches the window", () => {
    const { canvas, renderer, window } = setup(120, 40);
    // roomy bounds: the text's own box, not a 1 x 1 cell
    canvas.drawText(
      LayoutBounds.Create(100, 30, 10, 5),
      "M",
      style().setColor(colors.WHITE),
    );
    renderer.render();

    const ink = window
      .lastFrame()
      .pixels(10, 5, 100, 30)
      .filter((p) => distance(p, DEFAULT_BACKGROUND) > 40);
    expect(ink.length).toBeGreaterThan(0);
  });
});
