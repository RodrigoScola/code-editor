import { describe, expect, it } from "vitest";
import { cellCanvas, FakeWindow } from "./helpers.js";

// Level 1: the pieces exist and have the right shape. Nothing has to work
// yet; every module and method the later levels use is listed here, so this
// file is the checklist of what to create.
//
// Modules are imported dynamically, so a missing file fails its own spec
// with a message instead of breaking the whole file. The later levels import
// them normally: until a module exists, those files fail to load.
//
//   src/Input/windowInput.ts            WindowInputParser + event types
//   src/ui/Renderers/ansiColors.ts      ANSI color codes to CSS colors
//   src/ui/Renderers/WindowRenderer.ts  the Renderer that draws to a window
//   src/Editor/setupEditor.ts           setupEditor.window.connect(editor, renderer)

async function load<T>(path: string, hint: string): Promise<T> {
  try {
    return (await import(path)) as T;
  } catch (err) {
    throw new Error(`${hint}\n(${path}: ${(err as Error).message})`);
  }
}

const windowInput = () =>
  load<any>(
    "../../../src/Input/windowInput.js",
    "create src/Input/windowInput.ts",
  );
const ansiColors = () =>
  load<any>(
    "../../../src/ui/Renderers/ansiColors.js",
    "create src/ui/Renderers/ansiColors.ts",
  );
const windowRenderer = () =>
  load<any>(
    "../../../src/ui/Renderers/WindowRenderer.js",
    "create src/ui/Renderers/WindowRenderer.ts",
  );

describe("src/Input/windowInput.ts", () => {
  it.only("exports the WindowInputParser class", async () => {
    const { WindowInputParser } = await windowInput();
    expect(typeof WindowInputParser).eq("function");
  });

  it("WindowInputParser.parse is a static method", async () => {
    const { WindowInputParser } = await windowInput();
    expect(typeof WindowInputParser.parse).eq("function");
  });

  it("parse(textInput) returns an array", async () => {
    const { WindowInputParser } = await windowInput();
    expect(
      Array.isArray(WindowInputParser.parse({ type: "textInput", text: "a" })),
    ).eq(true);
  });

  it("parse(keyDown) returns an array", async () => {
    const { WindowInputParser } = await windowInput();
    const keyDown = {
      type: "keyDown",
      key: "escape",
      shift: false,
      ctrl: false,
      alt: false,
      repeat: false,
    };
    expect(Array.isArray(WindowInputParser.parse(keyDown))).eq(true);
  });
});

describe("src/ui/Renderers/ansiColors.ts", () => {
  it("exports ansiToCss(code)", async () => {
    const { ansiToCss } = await ansiColors();
    expect(typeof ansiToCss).eq("function");
  });

  it('exports DEFAULT_BACKGROUND and DEFAULT_FOREGROUND as "#rrggbb"', async () => {
    const { DEFAULT_BACKGROUND, DEFAULT_FOREGROUND } = await ansiColors();
    expect(DEFAULT_BACKGROUND).toMatch(/^#[0-9a-f]{6}$/);
    expect(DEFAULT_FOREGROUND).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("exports BASIC_COLORS, the 16 terminal colors", async () => {
    const { BASIC_COLORS } = await ansiColors();
    expect(BASIC_COLORS).toHaveLength(16);
  });
});

describe("src/ui/Renderers/WindowRenderer.ts", () => {
  it("exports the WindowRenderer class", async () => {
    const { WindowRenderer } = await windowRenderer();
    expect(typeof WindowRenderer).eq("function");
  });

  it("is built from a cell canvas and a window: new WindowRenderer(canvas, window)", async () => {
    const { WindowRenderer } = await windowRenderer();
    const renderer = new WindowRenderer(cellCanvas(4, 2), new FakeWindow());
    expect(renderer).toBeInstanceOf(WindowRenderer);
  });

  it("has WindowRenderer.Open(canvas), which opens a real SDL window", async () => {
    const { WindowRenderer } = await windowRenderer();
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
  ])("implements Renderer: %s()", async (method) => {
    const { WindowRenderer } = await windowRenderer();
    const renderer = new WindowRenderer(cellCanvas(4, 2), new FakeWindow());
    expect(typeof renderer[method]).eq("function");
  });

  it.each([
    "canvas",
    "cellWidth",
    "cellHeight",
    "gridSize",
    "onInput",
    "onResize",
    "onClose",
    "close",
  ])("has the window methods: %s()", async (method) => {
    const { WindowRenderer } = await windowRenderer();
    const renderer = new WindowRenderer(cellCanvas(4, 2), new FakeWindow());
    expect(typeof renderer[method]).eq("function");
  });

  it("listener methods return the renderer, so they chain", async () => {
    const { WindowRenderer } = await windowRenderer();
    const renderer = new WindowRenderer(cellCanvas(4, 2), new FakeWindow());

    expect(renderer.onInput(() => {})).toBe(renderer);
    expect(renderer.onResize(() => {})).toBe(renderer);
    expect(renderer.onClose(() => {})).toBe(renderer);
  });
});

describe("src/Editor/setupEditor.ts", () => {
  it("has setupEditor.window.connect(editor, renderer), next to setupEditor.terminal", async () => {
    const { setupEditor } = await load<any>(
      "../../../src/Editor/setupEditor.js",
      "src/Editor/setupEditor.ts failed to load",
    );
    expect(typeof setupEditor.window?.connect).eq("function");
  });
});
