import { describe, expect, it } from "vitest";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { FakeWindow } from "./helpers.js";

// Level 5: the window's size. The terminal lays out in cells, because all a
// terminal can show is a grid of characters. A window has pixels, so the
// WindowRenderer lays out in pixels and assumes no grid: text can be any
// size, and an element is as wide and as tall as it is, not a number of
// cells. Only the TerminalRenderer has cells.
//
//   new WindowRenderer(window)
//     window: anything shaped like an SDL window, PixelWindow:
//       { pixelWidth, pixelHeight, destroyed, render(...), on(...), destroy() }
//     The specs pass a FakeWindow (helpers.ts); WindowRenderer.Open() makes
//     a real one (level 10).
//
// layout() is in pixels. It starts as the whole window; when the window is
// resized, whoever listens (WindowEvents, level 8) calls setLayout() with
// the new size, the way handleResize does for the terminal.
//
// Also the parts of the Renderer interface (src/ui/TerminalRenderer.ts) that
// don't draw: isTerminalRenderer(), isWindowRenderer(). Nothing is drawn yet
// in this level.

function renderer(window = new FakeWindow(400, 200)) {
  return new WindowRenderer(window);
}

describe("layout(): the window, in pixels", () => {
  it("starts as the window's size", () => {
    const r = renderer(new FakeWindow(400, 200));

    expect(r.layout().width).eq(400);
    expect(r.layout().height).eq(200);
  });

  it("is any size, not rounded to anything", () => {
    const r = renderer(new FakeWindow(403, 217));

    expect(r.layout().width).eq(403);
    expect(r.layout().height).eq(217);
  });

  it("starts at the window's top left corner", () => {
    const r = renderer();

    expect(r.layout().x).eq(0);
    expect(r.layout().y).eq(0);
  });

  it("each renderer's layout is its own window's", () => {
    const small = renderer(new FakeWindow(10, 10));
    const large = renderer(new FakeWindow(2000, 1000));

    expect(small.layout().width).eq(10);
    expect(large.layout().width).eq(2000);
  });
});

describe("setLayout()", () => {
  it("sets the layout, in pixels, and returns the renderer", () => {
    const r = renderer();

    expect(r.setLayout(LayoutBounds.Create(640, 480))).toBe(r);
    expect(r.layout().width).eq(640);
    expect(r.layout().height).eq(480);
  });

  it("after a resize: the window's new size", () => {
    const window = new FakeWindow(400, 200);
    const r = renderer(window);

    window.resize(1024, 768);
    r.setLayout(LayoutBounds.Create(window.pixelWidth, window.pixelHeight));

    expect(r.layout().width).eq(1024);
    expect(r.layout().height).eq(768);
  });

  it("doesn't draw", () => {
    const window = new FakeWindow();
    renderer(window).setLayout(LayoutBounds.Create(640, 480));

    expect(window.renders).toHaveLength(0);
  });
});

describe("the Renderer interface, without drawing", () => {
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
