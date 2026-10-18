import { Canvas, SKRSContext2D } from "@napi-rs/canvas";
import { ComponentStyle } from "../ComponentStyles.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
import { TextLayout } from "../TextLayout/text.js";
import { ViewPort } from "../windows/viewport.js";
import { expandTabs, ICanvas } from "./TerminalCanvas.js";
import { Configuration } from "../../config.js";
import { ColorParser } from "../colors/Parsers/ColorParser.js";
import { DEFAULT_BACKGROUND, DEFAULT_FOREGROUND } from "../colors.js";
import { text } from "stream/consumers";
import { TextBuffer } from "../buffer/Buffer.js";

export class WindowCanvas implements ICanvas {
  private _canvas: Canvas;
  private _context: SKRSContext2D;

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    this._context = canvas.getContext("2d");
  }

  view() {
    return this._canvas;
  }

  getContext() {
    return this._context;
  }

  private applyTextStyles(otherStyle: ComponentStyle | null) {
    const ctx = this._context;

    const style = ComponentStyle.Blend(otherStyle, ComponentStyle.Create());

    if (style.isHidden()) {
      return;
    }

    ctx.textBaseline = "alphabetic";

    let background =
      ColorParser.ToHex(style.backgroundColor()) || DEFAULT_BACKGROUND;

    let color = ColorParser.ToHex(style.color()) || DEFAULT_FOREGROUND;

    if (style.isInverse()) {
      [background, color] = [color, background];
    }

    ctx.font = `${style.isItalic() ? "italic " : ""}${style.isBold() ? "bold " : ""}${style.fontSize()}px ${style.font()}`;

    ctx.fillStyle = color;
    ctx.globalAlpha = style.isDim() ? 0.5 : 1;
  }

  private applyStyle(style: ComponentStyle) {
    if (style.isHidden()) {
      return;
    }

    const canvas = this._context;

    let background =
      ColorParser.ToHex(style.backgroundColor()) || DEFAULT_BACKGROUND;
    let color = ColorParser.ToHex(style.color()) || DEFAULT_FOREGROUND;

    if (style.isInverse()) {
      [background, color] = [color, background];
    }

    canvas.fillStyle = background;
  }
  drawColumn(at: number, width: number, style: ComponentStyle): this {
    this.applyStyle(style);
    let startAt = at - Math.round(width / 2);
    for (let i = 0; i < width; i++) {
      this.lineTo(
        { x: startAt + i, y: 0 },
        { x: startAt + i, y: this._canvas.height },
        style,
      );
    }
    return this;
  }
  drawLine(at: number, width: number, style: ComponentStyle): this {
    this.applyStyle(style);
    let startAt = at - Math.round(width / 2);
    for (let i = 0; i < width; i++) {
      this.lineTo(
        { x: 0, y: startAt + i },
        { x: this._canvas.width, y: startAt + i },
        style,
      );
    }

    return this;
  }

  lineTo(start: Point, end: Point, style: ComponentStyle | null): this {
    return this.withClip(() => {
      const s = style || ComponentStyle.Blend(style, ComponentStyle.Create());

      this.applyStyle(s);

      const color = s.isInverse() ? s.color() : s.backgroundColor();

      const ctx = this._context;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.lineCap = "square";
      ctx.beginPath();
      ctx.moveTo(Math.floor(start.x) + 0.5, Math.floor(start.y) + 0.5);
      ctx.lineTo(Math.floor(end.x) + 0.5, Math.floor(end.y) + 0.5);
      ctx.stroke();

      this.resetTextStyles();
      this.resetStyles();
    });
  }
  clear(): this {
    this._context.fillStyle = DEFAULT_BACKGROUND;
    this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);

    return this;
  }
  fillRect(bounds: LayoutBounds, style: ComponentStyle): this {
    return this.withClip(() => {
      const s = style || ComponentStyle.Create();
      if (s.isHidden()) {
        return;
      }

      this.applyStyle(s);

      this._context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

      this.resetStyles();
    });
  }

  private _clip: LayoutBounds | null = null;

  clip() {
    return this._clip;
  }
  setClip(bounds: LayoutBounds | null) {
    this._clip = bounds;
    return this;
  }

  // runs a draw with the clip on, the way TerminalCanvas skips the cells
  // outside it (getCell / setCell). save()/restore() stack, so a draw's own
  // clip (drawText's bounds) only narrows this one, and restore() takes the
  // clip off again without touching the canvas's _clip
  private withClip(draw: () => void): this {
    const clip = this._clip;
    if (!clip) {
      draw();
      return this;
    }

    const ctx = this._context;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
    try {
      draw();
    } finally {
      ctx.restore();
    }
    return this;
  }

  drawText(bounds: LayoutBounds, text: string | TextLayout): this;
  drawText(
    bounds: LayoutBounds,
    text: string | TextLayout,
    style: ComponentStyle | null,
    viewport?: ViewPort,
  ): this;
  drawText(
    bounds: LayoutBounds,
    text: string | TextLayout,
    style?: ComponentStyle | null,
    viewport?: ViewPort,
  ): this;
  drawText(
    bounds: unknown,
    text: unknown,
    style?: unknown,
    viewport?: unknown,
  ): this {
    if (!(bounds instanceof LayoutBounds)) {
      return this;
    }
    if (!(typeof text === "string") && !(text instanceof TextLayout)) {
      return this;
    }

    if (style && !(style instanceof ComponentStyle)) {
      return this;
    }
    if (viewport && !(viewport instanceof ViewPort)) {
      return this;
    }

    // the checks above made sure these are what the overloads say
    return this.withClip(() =>
      this.drawBoundText(
        bounds,
        text,
        (style as ComponentStyle | undefined) ?? null,
        viewport as ViewPort | undefined,
      ),
    );
  }
  private drawBoundText(
    bounds: LayoutBounds,
    text: string | TextLayout,
    style: ComponentStyle | null,
    viewport?: ViewPort,
  ) {
    style ||= ComponentStyle.Blend(style, ComponentStyle.Create());
    this.applyStyle(style);

    if (style.isHidden()) {
      return this;
    }

    if (text instanceof TextLayout) {
      const first = viewport?.firstLine ?? 0;
      const last = Math.min(
        first + (viewport?.visibleLines ?? Infinity),
        text.height(),
      );

      const lt = bounds.clone();
      for (let i = first; i < last; i++) {
        const line = text.lines().at(i);
        if (!line) continue;

        // from bounds every time: the first visible line at the top, each next one below it
        lt.setY(bounds.y + (i - first) * style.fontSize())
          .setX(bounds.x + line.x())
          .setWidth(line.width() * style.fontSize())
          .setHeight(style.fontSize() * line.height());

        if (lt.y >= bounds.y + bounds.height) break; // below the bounds, not past their height
        this.drawString(lt, line.content(), style);
      }
      lt.dispose();
    } else if (typeof text === "string") {
      this.drawString(bounds, text, style);
    }

    this.resetTextStyles();
    this.resetStyles();
    return this;
  }

  private drawString(
    bounds: LayoutBounds,
    content: string,
    style: ComponentStyle | null,
  ) {
    style ||= ComponentStyle.Blend(style, ComponentStyle.Create());
    const ctx = this._context;

    // a tab is one character but takes up to tab_width columns, like in the
    // terminal canvas
    content = expandTabs(content, Configuration().tab_width);

    ctx.save(); // 1. remember the state, which has no clip yet
    ctx.beginPath(); // 2. start a new path
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip(); // 3. from here on, only pixels inside bounds change

    try {
      this.applyTextStyles(style); // sets the font and the text colour
      const textColor = ctx.fillStyle;

      const letterWidth = ctx.measureText("M").width;
      const visible = content.slice(0, Math.floor(bounds.width / letterWidth));
      const m = ctx.measureText(visible);
      const width = Math.round(m.width);
      const ascent = Math.round(ctx.measureText("M").fontBoundingBoxAscent);
      const height = Math.round(
        m.fontBoundingBoxAscent + m.fontBoundingBoxDescent,
      );

      // 1. background: one line tall, as wide as the letters, only if the style has one
      const background = ColorParser.ToHex(
        style.isInverse() ? style.color() : style.backgroundColor(),
      );
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(bounds.x, bounds.y, width, height);
      }

      // 2. the text on top
      ctx.fillStyle = textColor;
      ctx.fillText(visible, bounds.x, bounds.y + ascent);

      // 3. move the underline and strikethrough here from applyTextStyles,
      //    so the background can't cover them

      const thickness = Math.max(1, Math.round(height / 14));
      if (style.isUnderline()) {
        ctx.fillRect(
          bounds.x,
          bounds.y + Math.round(height * 0.85),
          width,
          thickness,
        );
      }
      if (style.isStrikeThrough()) {
        ctx.fillRect(
          bounds.x,
          bounds.y + Math.round(height / 4),
          width,
          thickness,
        );
      }
    } finally {
      ctx.restore();
    }
    return this;
  }
  // the drawing state back to Canvas 2D's defaults, so the next fillRect or
  // lineTo doesn't inherit this one's color, alpha or line shape
  resetStyles() {
    const ctx = this._context;

    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#000000";
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
  }

  // the same, plus the text state: the next text doesn't inherit this
  // text's font or alignment either
  resetTextStyles() {
    const ctx = this._context;

    this.resetStyles();
    ctx.font = "10px sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "start";
  }
}
