// Listens to a window for what the user does and hands on plain events, so
// nothing past it needs to know about SDL. The window's counterpart to what
// index.ts does for the terminal (process.stdin's "data", process.stdout's
// "resize"); the WindowRenderer only draws.
import { listeners } from "cluster";
import type { PixelWindow } from "../../ui/Renderers/WindowRenderer.js";
import type { WindowInputEvent } from "./windowInput.js";

export interface PixelSize {
  pixelWidth: number;
  pixelHeight: number;
}

export class WindowEvents {
  private _window: PixelWindow;
  // attaches itself to the window (window.on(...))
  constructor(window: PixelWindow) {
    this._window = window;
  }

  // keyDown and textInput, as WindowInputEvents
  onInput(listener: (event: WindowInputEvent) => void): this {
    //@ts-expect-error should add more typings
    this._window.on("keyDown", listener);
    //@ts-expect-error should add more typings
    this._window.on("textInput", listener);
    return this;
  }

  // the window's new size
  onResize(listener: (size: PixelSize) => void): this {
    //@ts-expect-error should add more typings
    this._window.on("resize", listener);
    return this;
  }

  // the user closed the window
  onClose(listener: () => void): this {
    this._window.on("close", listener);
    return this;
  }
}
