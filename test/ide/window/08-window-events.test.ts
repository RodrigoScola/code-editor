import { describe, expect, it } from "vitest";
import {
  WindowEvents,
  type PixelSize,
} from "../../../src/Input/window/windowEvents.js";
import type { WindowInputEvent } from "../../../src/Input/window/windowInput.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { FakeWindow } from "./helpers.js";

// Level 8: what the user does to the window. The WindowRenderer only draws,
// like the TerminalRenderer; listening is a WindowEvents' job. It's the
// window's counterpart to what index.ts does for the terminal
// (process.stdin's "data", process.stdout's "resize"): it attaches itself to
// the window (window.on(...)) and hands on plain events, so nothing past it
// needs to know about SDL.
//
//   src/Input/window/windowEvents.ts
//     new WindowEvents(window)  listens to a PixelWindow (SDL-shaped)
//     onInput(listener)         keyDown and textInput, as WindowInputEvents
//                               (the type WindowInputParser.Parse takes)
//     onResize(listener)        the window's new { pixelWidth, pixelHeight }
//     onClose(listener)         the user closed the window
//
//   and on the WindowRenderer:
//     window()                  the window it draws to, for a WindowEvents
//     close()                   closes the window (window.destroy())
//
// SDL's events have more fields than the editor uses (scancode, super,
// capslock, ...), and its types give the modifiers as numbers; the
// FakeWindow sends them that way.

function setup() {
  const window = new FakeWindow(400, 200);
  const events = new WindowEvents(window);
  const inputs: WindowInputEvent[] = [];
  events.onInput((event) => inputs.push(event));
  return { window, events, inputs };
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
    const { window, events, inputs } = setup();
    const second: WindowInputEvent[] = [];
    events.onInput((event) => second.push(event));
    window.textInput("a");

    expect(inputs).toHaveLength(1);
    expect(second).toHaveLength(1);
  });
});

describe("onResize", () => {
  it("gets the window's new size in pixels", () => {
    const { window, events } = setup();
    const sizes: PixelSize[] = [];
    events.onResize((size) => sizes.push(size));

    window.resize(500, 300);

    expect(sizes).toEqual([{ pixelWidth: 500, pixelHeight: 300 }]);
  });

  it("is told about every resize SDL reports (the editor decides what to skip)", () => {
    const { window, events } = setup();
    let count = 0;
    events.onResize(() => count++);

    window.resize(500, 300);
    window.resize(500, 300);

    expect(count).eq(2);
  });

  it("a resize is not input", () => {
    const { window, inputs } = setup();
    window.resize(500, 300);

    expect(inputs).toEqual([]);
  });
});

describe("onClose", () => {
  it("the user closed the window", () => {
    const { window, events } = setup();
    let closed = false;
    events.onClose(() => (closed = true));

    window.close();

    expect(closed).eq(true);
  });

  it("closing is not input", () => {
    const { window, inputs } = setup();
    window.close();

    expect(inputs).toEqual([]);
  });
});

describe("the renderer's side", () => {
  function renderer() {
    const window = new FakeWindow(400, 200);
    return { window, renderer: new WindowRenderer(window) };
  }

  it("window() is the window it draws to", () => {
    const { window, renderer: r } = renderer();
    expect(r.window()).toBe(window);
  });

  it("close() destroys the window", () => {
    const { window, renderer: r } = renderer();
    r.close();

    expect(window.destroyed).eq(true);
  });

  it("render() after close() draws nothing", () => {
    const { window, renderer: r } = renderer();
    r.close();
    r.render();

    expect(window.renders).toHaveLength(0);
  });

  it("close() twice is fine", () => {
    const { renderer: r } = renderer();
    r.close();

    expect(() => r.close()).not.toThrow();
  });
});
