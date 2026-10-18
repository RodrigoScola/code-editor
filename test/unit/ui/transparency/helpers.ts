import { describe } from "vitest";
import { TerminalCanvas } from "../../../../src/ui/Canvas/TerminalCanvas.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";
import { LayoutBounds } from "../../../../src/ui/layout/LayoutBounds.js";

// Shared by the transparency specs.
//
// PARKED: these are for later. Every file wraps its specs in later(), which
// skips them, so they don't add failures to `npx vitest run` until you start.
// To start, change the line below to:
//
//   export const later = describe;

export const later = describe.skip;

// a canvas of columns x rows, every cell the default (nothing painted)
export function cells(columns: number, rows = 1) {
  return new TerminalCanvas(LayoutBounds.Create(columns, rows));
}

export function style() {
  return ComponentStyle.Create();
}

// fills cells with a style, like a component's background
export function fill(
  canvas: TerminalCanvas,
  column: number,
  row: number,
  width: number,
  height: number,
  styles: ComponentStyle,
) {
  canvas.fillRect(LayoutBounds.Create(width, height, column, row), styles);
}

// writes text at a cell with a style
export function write(
  canvas: TerminalCanvas,
  column: number,
  row: number,
  text: string,
  styles: ComponentStyle,
) {
  canvas.drawText(
    LayoutBounds.Create(text.length, 1, column, row),
    text,
    styles,
  );
}

// what a cell holds after painting
export function at(canvas: TerminalCanvas, column: number, row: number) {
  const cell = canvas.getCell(column, row);
  if (!cell) {
    throw new Error(`no cell at ${column},${row}`);
  }
  return {
    char: cell.styles.display(),
    background: cell.styles.backgroundColor(),
    color: cell.styles.color(),
  };
}

// The window renderer and its fake window, loaded only when a spec runs:
// WindowRenderer doesn't exist until test/ide/window is built, and a static
// import would break this file even while it's parked.
export async function windowFor(
  canvas: TerminalCanvas,
  pixelWidth = 400,
  pixelHeight = 200,
) {
  const { WindowRenderer } =
    await import("../../../../src/ui/Renderers/WindowRenderer.js");
  const { FakeWindow } = await import("../../../ide/window/helpers.js");
  const window = new FakeWindow(pixelWidth, pixelHeight);
  const renderer = new WindowRenderer(canvas, window);
  return { renderer, window };
}

// the escape codes in a terminal frame that set a background
export function backgroundCodes(frame: string) {
  return frame.match(/\x1b\[(?:48;[0-9;]*|4[0-9]|10[0-7])m/g) ?? [];
}
