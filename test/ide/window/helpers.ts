import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type ICanvas,
  TerminalCanvas,
} from "../../../src/ui/Canvas/TerminalCanvas.js";
import { ComponentStyle } from "../../../src/ui/styles/ComponentStyles.js";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";
import { PixelWindow } from "../../../src/ui/Renderers/WindowRenderer.js";

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
export class FakeWindow implements PixelWindow {
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
    modifiers: {
      shift?: boolean;
      ctrl?: boolean;
      alt?: boolean;
      repeat?: boolean;
    } = {},
  ) {
    this.emit("keyDown", {
      key,
      type: "keyDown",
      repeat: modifiers.repeat ? true : false,
      shift: modifiers.shift ? true : false,
      ctrl: modifiers.ctrl ? true : false,
      alt: modifiers.alt ? true : false,
    });
  }

  textInput(text: string) {
    this.emit("textInput", { text, type: "textInput" });
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
  ":": ";",
  "(": "9",
  ")": "0",
  $: "4",
  _: "-",
  "<": ",",
  ">": ".",
  "?": "/",
  "!": "1",
  "{": "[",
  "}": "]",
  "+": "=",
  '"': "'",
  "*": "8",
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

  // ---- looking at it ----

  // prints the frame in the terminal, in color, like ide.show():
  //   frame.show("after inverse");
  //   frame.show("the cursor", { x: 0, y: 0, width: 40, height: 30 });
  // One character is two pixels stacked (▀: its color is the top pixel, its
  // background the bottom one). A frame wider than maxColumns is shrunk, each
  // character then averaging a block of pixels; pass a region to see it 1:1.
  show(label = "frame", region?: Region, maxColumns = 160) {
    const r = region ?? { x: 0, y: 0, width: this.width, height: this.height };
    const scale = Math.max(1, Math.ceil(r.width / maxColumns));
    const columns = Math.ceil(r.width / scale);
    const lines: string[] = [];

    for (let y = r.y; y < r.y + r.height; y += scale * 2) {
      let line = "";
      // a color is only sent when it changes, or a frame is megabytes
      let lastTop = "";
      let lastBottom = "";
      for (let x = r.x; x < r.x + r.width; x += scale) {
        const top = this.average(x, y, scale, r)!.join(";");
        const bottom = (this.average(x, y + scale, scale, r) ?? [0, 0, 0]).join(
          ";",
        );
        if (top !== lastTop) line += `\x1b[38;2;${top}m`;
        if (bottom !== lastBottom) line += `\x1b[48;2;${bottom}m`;
        line += "▀";
        lastTop = top;
        lastBottom = bottom;
      }
      lines.push(`│${line}\x1b[0m│`);
    }

    const size = `${r.width} x ${r.height} px at ${r.x}, ${r.y}`;
    const zoom = scale > 1 ? `, 1 char = ${scale} x ${scale * 2} px` : "";
    const border = "─".repeat(columns);

    // straight to stdout: vitest's reporters can swallow console.log from
    // tests that pass
    process.stdout.write(
      [
        `${label} (${size}${zoom})`,
        `┌${border}┐`,
        ...lines,
        `└${border}┘`,
      ].join("\n") + "\n",
    );
    return this;
  }

  // writes the frame as a PNG, every pixel zoom x zoom big so it is easy to
  // look at, and prints where (open it in VS Code):
  //   frame.save("inverse-cursor");
  save(name = "frame", zoom = 4) {
    const canvas = createCanvas(this.width * zoom, this.height * zoom);
    const ctx = canvas.getContext("2d");
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        ctx.fillStyle = this.pixel(x, y);
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }

    const dir = join(tmpdir(), "editor-frames");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${name}.png`);
    writeFileSync(file, canvas.toBuffer("image/png"));
    process.stdout.write(`${name}: ${file}\n`);
    return file;
  }

  // the average color of a size x size block, cut to the region; undefined
  // if the block is outside it
  private average(x: number, y: number, size: number, region: Region) {
    const sum = [0, 0, 0];
    let count = 0;
    for (let py = y; py < Math.min(y + size, region.y + region.height); py++) {
      for (let px = x; px < Math.min(x + size, region.x + region.width); px++) {
        const [r, g, b] = this.rgba(px, py);
        sum[0] += r;
        sum[1] += g;
        sum[2] += b;
        count++;
      }
    }
    return count === 0 ? undefined : sum.map((c) => Math.round(c / count));
  }
}

type Region = { x: number; y: number; width: number; height: number };

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
  return new TerminalCanvas(LayoutBounds.Create(columns, rows));
}

// paints text at a cell with a style; style() builds one
export function paint(
  canvas: ICanvas,
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
