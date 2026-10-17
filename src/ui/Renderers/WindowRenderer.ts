// The Renderer that draws into a native window, in pixels: no cells, those
// are the TerminalRenderer's. It only draws; listening to the window is
// WindowEvents' job (src/Input/windowEvents.ts)
import type { DisplayLike } from "../layout/layout.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
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

export class WindowRenderer implements Renderer {
  private  _layout:LayoutBounds =  LayoutBounds.Create()
  constructor(window: PixelWindow) {}

  // on a new SDL window, resizable
  static Open(): WindowRenderer {
    throw new Error("not implemented");
  }

  // Renderer

  build(root: DisplayLike): this {
    throw new Error("not implemented");
  }

  // the pixels, handed to window.render()
  render(): void {
    throw new Error("not implemented");
  }

  // in pixels
  setLayout(layout: LayoutBounds): this {
    throw new Error("not implemented");
  }

  // in pixels; starts as the whole window
  layout(): LayoutBounds {
    throw new Error("not implemented");
  }

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

  // the window it draws to; a WindowEvents listens to it (src/Input/windowEvents.ts)
  window(): PixelWindow {
    throw new Error("not implemented");
  }

  // window.destroy()
  close(): void {
    throw new Error("not implemented");
  }
}
