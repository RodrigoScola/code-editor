// The Renderer that draws the cell canvas into a native window
import type { WindowInputEvent } from "../../Input/windowInput.js";
import type { Canvas } from "../canvas.js";
import type { DisplayLike } from "../layout/layout.js";
import type { LayoutBounds } from "../layout/LayoutBounds.js";
import type { Renderer } from "../TerminalRenderer.js";

// anything shaped like an SDL window
export interface PixelWindow {
  pixelWidth: number;
  pixelHeight: number;
  destroyed: boolean;
  render(width: number, height: number, stride: number, format: string, buffer: Buffer): void;
  on(event: string, listener: (payload: unknown) => void): unknown;
  destroy(): void;
}

export interface GridSize {
  columns: number;
  rows: number;
}

export class WindowRenderer implements Renderer {
  constructor(canvas: Canvas, window: PixelWindow) {}

  // on a new SDL window, sized to fit the canvas's cells, resizable
  static Open(canvas: Canvas): WindowRenderer {
    throw new Error("not implemented");
  }

  // Renderer

  // paints the component tree into the cell canvas
  build(root: DisplayLike): this {
    throw new Error("not implemented");
  }

  // cells to pixels, handed to window.render()
  render(): void {
    throw new Error("not implemented");
  }

  setLayout(layout: LayoutBounds): this {
    throw new Error("not implemented");
  }

  layout(): LayoutBounds {
    throw new Error("not implemented");
  }

  // the canvas as plain text, rows joined with "\r\n"
  frame(): string {
    throw new Error("not implemented");
  }

  isTerminalRenderer(): boolean {
    throw new Error("not implemented");
  }

  isWindowRenderer(): boolean {
    throw new Error("not implemented");
  }

  invalidate(): void {
    throw new Error("not implemented");
  }

  // the window

  canvas(): Canvas {
    throw new Error("not implemented");
  }

  // whole pixels, measured once from the font
  cellWidth(): number {
    throw new Error("not implemented");
  }

  cellHeight(): number {
    throw new Error("not implemented");
  }

  // how many whole cells fit in the window
  gridSize(): GridSize {
    throw new Error("not implemented");
  }

  onInput(listener: (event: WindowInputEvent) => void): this {
    throw new Error("not implemented");
  }

  // the new gridSize()
  onResize(listener: (size: GridSize) => void): this {
    throw new Error("not implemented");
  }

  onClose(listener: () => void): this {
    throw new Error("not implemented");
  }

  // window.destroy()
  close(): void {
    throw new Error("not implemented");
  }
}
