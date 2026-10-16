import { describe, expect, it } from "vitest";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import type { WindowInputEvent } from "../../../src/Input/windowInput.js";
import { cellCanvas, FakeWindow } from "./helpers.js";

// Level 8: what the user does to the window reaches the editor. The renderer
// listens to its window (window.on(...)) and hands on plain events, so
// nothing past it needs to know about SDL:
//
//   onInput(listener)   keyDown and textInput, as WindowInputEvents
//                       (the type WindowInputParser.parse takes)
//   onResize(listener)  the new gridSize() when the window is resized
//   onClose(listener)   the user closed the window
//   close()             closes the window (window.destroy())
//
// SDL's events have more fields than the editor uses (scancode, super,
// capslock, ...), and its types give the modifiers as numbers; the
// FakeWindow sends them that way.

function setup() {
  const window = new FakeWindow(400, 200);
  const renderer = new WindowRenderer(cellCanvas(4, 2), window);
  const inputs: WindowInputEvent[] = [];
  renderer.onInput((event: WindowInputEvent) => inputs.push(event));
  return { window, renderer, inputs };
}

describe("onInput: keys", () => {
  it("keyDown arrives as a WindowKeyDown with only its fields", () => {
    const { window, inputs } = setup();
    window.keyDown("escape");

    expect(inputs).toEqual([
      {
        type: "keyDown",
        key: "escape",
        shift: false,
        ctrl: false,
        alt: false,
        repeat: false,
      },
    ]);
  });

  it("SDL's number modifiers become booleans", () => {
    const { window, inputs } = setup();
    window.keyDown("w", { ctrl: true, shift: true, alt: true, repeat: true });

    expect(inputs).toEqual([
      {
        type: "keyDown",
        key: "w",
        shift: true,
        ctrl: true,
        alt: true,
        repeat: true,
      },
    ]);
  });

  it("a key with no virtual key arrives with key: null", () => {
    const { window, inputs } = setup();
    window.keyDown(null);

    expect(inputs[0]).toMatchObject({ type: "keyDown", key: null });
  });

  it("textInput arrives as a WindowTextInput", () => {
    const { window, inputs } = setup();
    window.textInput("é");

    expect(inputs).toEqual([{ type: "textInput", text: "é" }]);
  });

  it("typing a letter is its keyDown, then its textInput, in order", () => {
    const { window, inputs } = setup();
    window.type("X");

    expect(inputs.map((e) => e.type)).toEqual(["keyDown", "textInput"]);
  });

  it("keyUp is not input", () => {
    const { window, inputs } = setup();
    window.emit("keyUp", { key: "a", shift: 0, ctrl: 0, alt: 0 });

    expect(inputs).toEqual([]);
  });

  it("the mouse is not keyboard input", () => {
    const { window, inputs } = setup();
    window.emit("mouseMove", { x: 3, y: 4 });
    window.emit("mouseButtonDown", { x: 3, y: 4, button: 1 });

    expect(inputs).toEqual([]);
  });

  it("every onInput listener gets every event", () => {
    const { window, renderer, inputs } = setup();
    const second: WindowInputEvent[] = [];
    renderer.onInput((event: WindowInputEvent) => second.push(event));
    window.textInput("a");

    expect(inputs).toHaveLength(1);
    expect(second).toHaveLength(1);
  });
});

describe("onResize", () => {
  it("gets the grid that fits the new size", () => {
    const { window, renderer } = setup();
    const sizes: unknown[] = [];
    renderer.onResize((size: unknown) => sizes.push(size));

    window.resize(renderer.cellWidth() * 50, renderer.cellHeight() * 20);

    expect(sizes).toEqual([{ columns: 50, rows: 20 }]);
  });

  it("is told about every resize SDL reports (the editor decides what to skip)", () => {
    const { window, renderer } = setup();
    let count = 0;
    renderer.onResize(() => count++);

    window.resize(500, 300);
    window.resize(500, 300);

    expect(count).eq(2);
  });

  it("doesn't draw by itself", () => {
    const { window, renderer } = setup();
    renderer.onResize(() => {});
    window.resize(500, 300);

    expect(window.renders).toHaveLength(0);
  });
});

describe("closing", () => {
  it("onClose: the user closed the window", () => {
    const { window, renderer } = setup();
    let closed = false;
    renderer.onClose(() => (closed = true));

    window.close();

    expect(closed).eq(true);
  });

  it("close() destroys the window", () => {
    const { window, renderer } = setup();
    renderer.close();

    expect(window.destroyed).eq(true);
  });

  it("render() after close() draws nothing", () => {
    const { window, renderer } = setup();
    renderer.close();
    renderer.render();

    expect(window.renders).toHaveLength(0);
  });

  it("close() twice is fine", () => {
    const { renderer } = setup();
    renderer.close();

    expect(() => renderer.close()).not.toThrow();
  });
});
