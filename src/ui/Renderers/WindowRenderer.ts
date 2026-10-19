// The Renderer that draws into a native window, in pixels: no cells, those
// are the TerminalRenderer's. It only draws; listening to the window is
// WindowEvents' job (src/Input/windowEvents.ts)
import { assert } from "node:console";
import type { DisplayLike } from "../layout/layout.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
import { TerminalRenderer, type Renderer } from "./TerminalRenderer.js";
import { Canvas, createCanvas } from "@napi-rs/canvas";
import { Rendering } from "./Renderer.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { WindowCanvas } from "../Canvas/WindowCanvas.js";
import { format } from "node:path";
import { buffer } from "node:stream/consumers";
import { DEFAULT_BACKGROUND } from "../colors.js";

// anything shaped like an SDL window
export interface PixelWindow {
  pixelWidth: number;
  pixelHeight: number;
  destroyed: boolean;
  render(
    width: number,
    height: number,
    stride: number,
    format: string,
    buffer: Buffer,
  ): void;
  on(event: string, listener: (payload: unknown) => void): unknown;
  destroy(): void;
}

export class WindowRenderer implements Renderer {
  private _layout: LayoutBounds = LayoutBounds.Create();
  private _window: PixelWindow;
  private _canvas: WindowCanvas;

  constructor(window: PixelWindow) {
    this._window = window;
    this._layout
      .setHeight(Math.round(window.pixelHeight))
      .setWidth(Math.round(window.pixelWidth));

    this._canvas = new WindowCanvas(
      createCanvas(this._window.pixelWidth, this._window.pixelHeight),
    );

    this.reload();
  }

  reload() {
    this._canvas.dispose();
    this._canvas = new WindowCanvas(
      createCanvas(this._layout.width, this._layout.height),
    );
    this._canvas.clear();
  }

  // on a new SDL window, resizable
  static Open(): WindowRenderer {
    throw new Error("not implemented");
  }

  // Renderer

  build(root: DisplayLike): this {
    this._canvas.clear();
    this.paint(root);
    return this;
  }
  private paint(root: DisplayLike) {
    const components = Rendering.GetComponents(root);
    const canvas = this._canvas;

    Rendering.SortComponents(components);

    let defaultBlend = ComponentStyle.Create();

    for (const componentLike of components) {
      const component = componentLike.view();
      assert(component.visible(), "component should not be visible");
      // children of a component with overflow set stay inside it
      canvas.setClip(component.clipBounds());

      defaultBlend.blend(component.styles(), component.parent()?.styles());
      canvas.fillRect(component.layout(), defaultBlend);
      defaultBlend.reset();

      Rendering.Border(component, canvas);

      component.onPrePaint(canvas);
      component.paint(canvas);

      defaultBlend.blend(component.styles(), component.parent()?.styles());

      Rendering.ScrollBar(component, canvas);

      Rendering.Content(component, canvas, defaultBlend);

      defaultBlend.reset();
    }
    for (const componentLike of components) {
      const component = componentLike.view();
      canvas.setClip(component.clipBounds());
      component.postPaint(canvas);
    }
    canvas.setClip(null);

    defaultBlend.dispose();
  }

  // the window-sized canvas each frame is put together on. Its own field:
  // _canvas holds what build() painted, and must survive until render()
  // copies it. Kept between renders, a new one only when the window's size
  // changes
  private _frame: Canvas | null = null;

  private frameCanvas(width: number, height: number): Canvas {
    const frame = this._frame;
    if (!frame || frame.width !== width || frame.height !== height) {
      this._frame = createCanvas(width, height);
    }
    return this._frame!;
  }

  // the canvas build() paints into
  canvas(): WindowCanvas {
    return this._canvas;
  }

  // the pixels, handed to window.render()
  render(): void {
    const window = this._window;
    if (window.destroyed) return;

    const width = window.pixelWidth;
    const height = window.pixelHeight;

    // the frame: the window's size, DEFAULT_BACKGROUND where the canvas
    // doesn't reach (it still holds the last frame there otherwise)
    const ctx = this.frameCanvas(width, height).getContext("2d");
    ctx.fillStyle = DEFAULT_BACKGROUND;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(this._canvas.view(), 0, 0); // what build() painted

    const pixels = Buffer.from(ctx.getImageData(0, 0, width, height).data);
    window.render(width, height, width * 4, "rgba32", pixels);
  }

  // in pixels
  setLayout(layout: LayoutBounds): this {
    this._layout = layout;

    this.reload();
    return this;
  }

  // in pixels; starts as the whole window
  layout(): LayoutBounds {
    return this._layout;
  }

  frame(): string {
    return this._canvas.texts();
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

  isTerminalRenderer() {
    return false;
  }

  isWindowRenderer(): boolean {
    return true;
  }
}
