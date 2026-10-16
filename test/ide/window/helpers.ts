import { Canvas } from "../../../src/ui/canvas.js";
import { ComponentStyle } from "../../../src/ui/ComponentStyles.js";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";

// Shared by the window specs. Only imports modules that exist already, so a
// spec fails on what it tests and not because another level isn't built.

type Listener = (event: any) => void;

// one frame handed to window.render()
export type RenderCall = {
  width: number;
  height: number;
  stride: number;
  format: string;
  buffer: Buffer;
};

// Stands in for an SDL window (the PixelWindow the WindowRenderer draws to):
// it records every frame instead of showing it, and sends the events a real
// window would, shaped like SDL's (modifiers come as numbers, plus fields
// the editor doesn't use).
export class FakeWindow {
  pixelWidth: number;
  pixelHeight: number;
  destroyed = false;
  renders: RenderCall[] = [];
  private listeners = new Map<string, Listener[]>();

  constructor(pixelWidth = 400, pixelHeight = 200) {
    this.pixelWidth = pixelWidth;
    this.pixelHeight = pixelHeight;
  }

  render(
    width: number,
    height: number,
    stride: number,
    format: string,
    buffer: Buffer,
  ) {
    // a copy: the renderer may reuse its buffer for the next frame
    this.renders.push({
      width,
      height,
      stride,
      format,
      buffer: Buffer.from(buffer),
    });
  }

  on(event: string, listener: Listener) {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
    return this;
  }

  destroy() {
    this.destroyed = true;
  }

  // ---- the user doing things to the window ----

  emit(event: string, payload: unknown = {}) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }

  keyDown(
    key: string | null,
    modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean; repeat?: boolean } = {},
  ) {
    this.emit("keyDown", {
      scancode: 4,
      key,
      repeat: modifiers.repeat ? 1 : 0,
      shift: modifiers.shift ? 1 : 0,
      ctrl: modifiers.ctrl ? 1 : 0,
      alt: modifiers.alt ? 1 : 0,
      super: 0,
      altgr: 0,
      capslock: 0,
      numlock: 0,
    });
  }

  textInput(text: string) {
    this.emit("textInput", { text });
  }

  // typing text the way a keyboard does: keyDown, then textInput, for every
  // character (see typing() below for the keys)
  type(text: string) {
    for (const ch of text) {
      const { key, shift } = keyFor(ch);
      this.keyDown(key, { shift });
      this.textInput(ch);
    }
  }

  // the user dragging the window's edge; SDL sends the new size
  resize(pixelWidth: number, pixelHeight: number) {
    this.pixelWidth = pixelWidth;
    this.pixelHeight = pixelHeight;
    this.emit("resize", {
      width: pixelWidth,
      height: pixelHeight,
      pixelWidth,
      pixelHeight,
    });
  }

  close() {
    this.emit("close");
  }

  // ---- reading what was drawn ----

  lastFrame(): Frame {
    const last = this.renders.at(-1);
    if (!last) {
      throw new Error("nothing was rendered to the window");
    }
    return new Frame(last);
  }
}

// the key a US keyboard presses (with Shift) for a symbol
const SHIFTED: Record<string, string> = {
  ":": ";", "(": "9", ")": "0", $: "4", _: "-", "<": ",", ">": ".",
  "?": "/", "!": "1", "{": "[", "}": "]", "+": "=", '"': "'", "*": "8",
};

// SDL's virtual key for the key that types ch, and whether Shift is down
export function keyFor(ch: string) {
  const isUpper = ch >= "A" && ch <= "Z";
  const key = ch === " " ? "space" : (SHIFTED[ch] ?? ch.toLowerCase());
  return { key, shift: isUpper || ch in SHIFTED };
}

// A frame's pixels. Colors are read as "#rrggbb"
export class Frame {
  constructor(readonly call: RenderCall) {}

  get width() {
    return this.call.width;
  }
  get height() {
    return this.call.height;
  }

  rgba(x: number, y: number): [number, number, number, number] {
    const i = y * this.call.stride + x * 4;
    const b = this.call.buffer;
    return [b[i], b[i + 1], b[i + 2], b[i + 3]];
  }

  pixel(x: number, y: number): string {
    const [r, g, b] = this.rgba(x, y);
    return hex(r, g, b);
  }

  // every pixel of a rectangle, row by row
  pixels(x: number, y: number, width: number, height: number): string[] {
    const out: string[] = [];
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        out.push(this.pixel(px, py));
      }
    }
    return out;
  }

  // the distinct colors in a rectangle
  colors(x: number, y: number, width: number, height: number): Set<string> {
    return new Set(this.pixels(x, y, width, height));
  }
}

export function hex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function rgb(color: string): [number, number, number] {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// how far apart two "#rrggbb" colors are (the largest channel difference)
export function distance(a: string, b: string) {
  const ca = rgb(a);
  const cb = rgb(b);
  return Math.max(...ca.map((c, i) => Math.abs(c - cb[i])));
}

// how bright a "#rrggbb" color is (sum of channels)
export function brightness(color: string) {
  const [r, g, b] = rgb(color);
  return r + g + b;
}

// ---- cell canvases to render ----

// a cell canvas of columns x rows, every cell blank (default colors, " ")
export function cellCanvas(columns: number, rows: number) {
  return new Canvas(LayoutBounds.Create(columns, rows));
}

// paints text at a cell with a style; style() builds one
export function paint(
  canvas: Canvas,
  column: number,
  row: number,
  text: string,
  styles: ComponentStyle,
) {
  const bounds = LayoutBounds.Create(text.length, 1, column, row);
  canvas.fillRect(bounds, styles);
  canvas.drawText(bounds, text, styles);
}

export function style() {
  return ComponentStyle.Create();
}
