import { describe, expect, it } from "vitest";
// WindowRenderer before the UI modules: importing displayComponent first runs
// into a circular import (UiComponent / UIScreen)
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import colors from "../../../src/ui/colors/colors.js";
import { DisplayComponent } from "../../../src/ui/display/displayComponent.js";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";
import { LayoutEngine } from "../../../src/ui/layout/layout.js";
import { vim } from "../harness.js";
import { FakeWindow, style } from "./helpers.js";

// Level 7: the rest of the Renderer interface, which TerminalRenderer has
// too, so the editor can use either one:
//
//   build(root)  paints the component tree into the canvas, as
//                TerminalRenderer.build does (backgrounds, borders,
//                scrollbars, text, the cursor). Returns the renderer.
//   frame()      the text the canvas shows, like innerText in HTML: a
//                window has no grid of characters to read back, only pixels,
//                so it is the text that was drawn, in reading order. Top to
//                bottom one line per row of text (text drawn at the same y),
//                left to right within a row, joined by a space; rows joined
//                by "\r\n". Only what was drawn: the part that fit, nothing
//                hidden. No escape codes.
//
// Neither one draws to the window; only render() does.

function renderer(width = 200, height = 60, window = new FakeWindow()) {
  window.pixelWidth = width;
  window.pixelHeight = height;
  return new WindowRenderer(window);
}

// x, y, width, height
function bounds(x: number, y: number, width: number, height: number) {
  return LayoutBounds.Create(width, height, x, y);
}

describe("frame(): the text the canvas shows", () => {
  it("a blank canvas has no text", () => {
    expect(renderer().frame()).eq("");
  });

  it("text drawn on the canvas comes back", () => {
    const r = renderer();
    r.canvas().drawText(bounds(10, 10, 180, 30), "hi", style());

    expect(r.frame()).eq("hi");
  });

  it("has no escape codes, whatever the colors", () => {
    const r = renderer();
    r.canvas().drawText(
      bounds(10, 10, 180, 30),
      "ab",
      style()
        .setBackgroundColor(colors.BLUE)
        .setColor(colors.RED)
        .setBold(true),
    );

    expect(r.frame()).eq("ab");
  });

  it("one line per row of text, top to bottom", () => {
    const r = renderer();
    // drawn bottom first: the order of drawing doesn't matter, the place does
    r.canvas().drawText(bounds(10, 35, 180, 20), "second", style());
    r.canvas().drawText(bounds(10, 10, 180, 20), "first", style());

    expect(r.frame()).eq("first\r\nsecond");
  });

  it("text on the same row joins left to right, with a space", () => {
    const r = renderer();
    r.canvas().drawText(bounds(100, 10, 90, 20), "world", style());
    r.canvas().drawText(bounds(10, 10, 80, 20), "hello", style());

    expect(r.frame()).eq("hello world");
  });

  it("only the part that fit in its bounds", () => {
    const r = renderer();
    r.canvas().drawText(bounds(10, 10, 30, 20), "MMMMMMMMMM", style());
    const text = r.frame();

    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThan(10);
    expect("MMMMMMMMMM".startsWith(text)).eq(true);
  });

  // like innerText, which leaves out visibility: hidden
  it("hidden text isn't in it", () => {
    const r = renderer();
    r.canvas().drawText(bounds(10, 10, 180, 20), "secret", style().setHidden(true));
    r.canvas().drawText(bounds(10, 35, 180, 20), "shown", style());

    expect(r.frame()).eq("shown");
  });

  it("clear() empties it", () => {
    const r = renderer();
    r.canvas().drawText(bounds(10, 10, 180, 20), "gone", style());
    r.canvas().clear();

    expect(r.frame()).eq("");
  });

  it("doesn't draw to the window", () => {
    const window = new FakeWindow();
    const r = renderer(200, 60, window);
    r.canvas().drawText(bounds(10, 10, 180, 20), "hi", style());
    r.frame();

    expect(window.renders).toHaveLength(0);
  });
});

// a 200 x 100 root with one 150 x 30 child (blue, "hello window"), laid out
// in pixels, the way the window lays out
function tree() {
  const root = new DisplayComponent().setLayout(
    LayoutEngine.CreateBounds(200, 100),
  );
  const box = new DisplayComponent()
    .setWidth(150)
    .setHeight(30)
    .setBackgroundColor(colors.BLUE)
    .setContent("hello window");
  root.addChildren(box);

  LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(200, 100));
  LayoutEngine.Arrange(root);
  return root;
}

describe("build(root): painting a component tree", () => {
  it("paints the components' text: frame() has it", () => {
    const r = renderer(200, 100);
    r.build(tree());

    expect(r.frame()).eq("hello window");
  });

  it("paints the components' backgrounds", () => {
    const window = new FakeWindow();
    const r = renderer(200, 100, window);
    r.build(tree()).render();
    const frame = window.lastFrame();

    // inside the box, right of its text, and outside it
    expect(frame.pixel(140, 25)).eq("#2472c8");
    expect(frame.pixel(180, 60)).not.eq("#2472c8");
  });

  it("returns the renderer", () => {
    const r = renderer(200, 100);

    expect(r.build(tree())).toBe(r);
  });

  it("a second build starts from a clean canvas", () => {
    const r = renderer(200, 100);
    r.canvas().drawText(bounds(10, 60, 180, 20), "leftover", style());
    expect(r.frame()).toContain("leftover");

    r.build(tree());

    expect(r.frame()).not.toContain("leftover");
  });

  it("doesn't draw to the window", () => {
    const window = new FakeWindow();
    renderer(200, 100, window).build(tree());

    expect(window.renders).toHaveLength(0);
  });

  it("render() after build() shows the built screen in the window", () => {
    const window = new FakeWindow();
    renderer(200, 100, window).build(tree()).render();

    expect(window.renders).toHaveLength(1);
  });

  // the whole editor builds without throwing; how its cell-sized layout
  // looks in pixels is for the levels that connect it to a window
  it("builds the editor's tree", () => {
    const ide = vim("hello |world\nsecond line");
    ide.screen();

    expect(() => renderer(400, 200).build(ide.rootWindow)).not.toThrow();
  });
});
