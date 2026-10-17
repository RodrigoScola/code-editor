import { describe, expect, it } from "vitest";
import { setupEditor } from "../../../src/Editor/setupEditor.js";
import { WindowEvents } from "../../../src/Input/windowEvents.js";
import { WindowInputParser } from "../../../src/Input/windowInput.js";
import * as ansiColors from "../../../src/ui/Renderers/ansiColors.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { FakeWindow } from "./helpers.js";

// Level 1: the pieces exist and have the right shape. Nothing has to work
// yet; every module and method the later levels use is listed here, so this
// file is the checklist of what to create.
//
//   src/Input/windowInput.ts            WindowInputParser + event types
//   src/Input/windowEvents.ts           WindowEvents: listens to the window
//   src/ui/Renderers/ansiColors.ts      ANSI color codes to CSS colors
//   src/ui/Renderers/WindowRenderer.ts  the Renderer that draws to a window
//   src/Editor/setupEditor.ts           setupEditor.window.connect(editor, renderer)

describe("src/Input/windowInput.ts", () => {
  it("exports the WindowInputParser class", () => {
    expect(typeof WindowInputParser).eq("function");
  });

  it("WindowInputParser.Parse is a static method", () => {
    expect(typeof WindowInputParser.Parse).eq("function");
  });

  it("Parse(textInput) returns an array", () => {
    expect(
      Array.isArray(WindowInputParser.Parse({ type: "textInput", text: "a" })),
    ).eq(true);
  });

  it("Parse(keyDown) returns an array", () => {
    const keyDown = {
      type: "keyDown",
      key: "escape",
      shift: false,
      ctrl: false,
      alt: false,
      repeat: false,
    } as const;
    expect(Array.isArray(WindowInputParser.Parse(keyDown))).eq(true);
  });
});

describe("src/ui/Renderers/ansiColors.ts", () => {
  it("exports ansiToCss(code)", () => {
    expect(typeof ansiColors.ansiToCss).eq("function");
  });

  it('exports DEFAULT_BACKGROUND and DEFAULT_FOREGROUND as "#rrggbb"', () => {
    expect(ansiColors.DEFAULT_BACKGROUND).toMatch(/^#[0-9a-f]{6}$/);
    expect(ansiColors.DEFAULT_FOREGROUND).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("src/ui/Renderers/WindowRenderer.ts", () => {
  it("exports the WindowRenderer class", () => {
    expect(typeof WindowRenderer).eq("function");
  });

  // pixels, no cell canvas: cells are the TerminalRenderer's
  it("is built from a window: new WindowRenderer(window)", () => {
    const renderer = new WindowRenderer(new FakeWindow());
    expect(renderer).toBeInstanceOf(WindowRenderer);
  });

  it("has WindowRenderer.Open(), which opens a real SDL window", () => {
    expect(typeof WindowRenderer.Open).eq("function");
  });

  // the same interface as TerminalRenderer, so EditorContext.renderer can be
  // either one
  it.each([
    "build",
    "render",
    "setLayout",
    "layout",
    "frame",
    "isTerminalRenderer",
    "isWindowRenderer",
  ] as const)("implements Renderer: %s()", (method) => {
    const renderer = new WindowRenderer(new FakeWindow());
    expect(typeof renderer[method]).eq("function");
  });

  it.each(["window", "close"] as const)(
    "has the window methods: %s()",
    (method) => {
      const renderer = new WindowRenderer(new FakeWindow());
      expect(typeof renderer[method]).eq("function");
    },
  );
});

// the renderer only draws; this listens to the window, like index.ts listens
// to process.stdin for the terminal
describe("src/Input/windowEvents.ts", () => {
  it("exports the WindowEvents class", () => {
    expect(typeof WindowEvents).eq("function");
  });

  it("is built from a window: new WindowEvents(window)", () => {
    expect(new WindowEvents(new FakeWindow())).toBeInstanceOf(WindowEvents);
  });

  it.each(["onInput", "onResize", "onClose"] as const)("has %s()", (method) => {
    const events = new WindowEvents(new FakeWindow());
    expect(typeof events[method]).eq("function");
  });

  it("listener methods return the WindowEvents, so they chain", () => {
    const events = new WindowEvents(new FakeWindow());

    expect(events.onInput(() => {})).toBe(events);
    expect(events.onResize(() => {})).toBe(events);
    expect(events.onClose(() => {})).toBe(events);
  });
});

describe("src/Editor/setupEditor.ts", () => {
  it("has setupEditor.window.connect(editor, renderer), next to setupEditor.terminal", () => {
    expect(typeof setupEditor.window?.connect).eq("function");
  });
});
