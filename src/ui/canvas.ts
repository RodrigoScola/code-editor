import colors from "./colors.js";
import { ComponentBorder } from "./display/border.js";
import { ComponentStyle } from "./ComponentStyles.js";
import { Configuration } from "../config.js";
import { TextLayout } from "./TextLayout/text.js";
import { ViewPort } from "./windows/viewport.js";
import { LayoutBounds } from "./layout/LayoutBounds.js";
import { DisplayTile } from "./display/DisplayTile.js";

export interface ICanvas {
  lineTo(start: Point, end: Point, style: ComponentStyle | null): void;
  clear(): void;
  fillRect(bounds: LayoutBounds, style: ComponentStyle | null): void;
  drawText(bounds: LayoutBounds, text: string | TextLayout): void;
  drawText(
    bounds: LayoutBounds,
    text: string | TextLayout,
    style: ComponentStyle | null | undefined,
    viewport?: ViewPort,
  ): void;
  drawText(
    bounds: LayoutBounds,
    text: string | TextLayout,
    style?: ComponentStyle | null,
    viewport?: ViewPort,
  ): void;
}

const DEFAULT_STYLE: ComponentStyle = ComponentStyle.Create()
  .setBackgroundColor(colors.BACKGROUND_OFF)
  .setColor(colors.FOREGROUND_OFF)
  .setDisplay(" ");

export class Canvas implements ICanvas {
  l: LayoutBounds = LayoutBounds.Create();

  private canvas: DisplayTile[][];

  layout() {
    return this.l;
  }
  setLayout(layout: LayoutBounds) {
    this.l = layout;
    this.clear();
    return this;
  }

  constructor(layout?: LayoutBounds) {
    this.canvas = new Array();
    if (layout) {
      this.setLayout(layout);
    }
  }
  // bresenham: walks one cell at a time from start to end (both included),
  // in any direction, stepping on the minor axis when the error builds up
  lineTo(start: Point, end: Point, style: ComponentStyle | null): void {
    let x = Math.floor(start.x);
    let y = Math.floor(start.y);
    const endX = Math.floor(end.x);
    const endY = Math.floor(end.y);

    const dx = Math.abs(endX - x);
    const dy = -Math.abs(endY - y);
    const stepX = x < endX ? 1 : -1;
    const stepY = y < endY ? 1 : -1;
    let error = dx + dy;

    while (true) {
      const cell = this.getCell(x, y);
      if (cell) {
        cell.setStyles(ComponentStyle.Blend(style, DEFAULT_STYLE));
      }

      if (x === endX && y === endY) {
        break;
      }

      const doubled = error * 2;
      if (doubled >= dy) {
        error += dy;
        x += stepX;
      }
      if (doubled <= dx) {
        error += dx;
        y += stepY;
      }
    }
  }

  width(): number {
    return this.l.width;
  }
  height() {
    return this.l.height;
  }

  startX() {
    return this.l.x;
  }

  startY() {
    return this.l.y;
  }
  getRow(at: number) {
    return this.canvas.at(at);
  }

  private createTile(x: number, y: number): DisplayTile {
    return DisplayTile.Create().setX(x).setY(y).setStyles(DEFAULT_STYLE);
  }
  private resetCanvas() {
    for (let i = 0; i < this.height(); i++) {
      const row = this.getRow(i);

      if (!row) continue;
      for (const item of row) {
        item.styles.dispose();
        item.dispose();
      }
    }

    this.canvas = [];
    for (let i = 0; i < this.height(); i++) {
      this.canvas.push([]);
      for (let j = 0; j < this.width(); j++) {
        this.canvas[i].push(this.createTile(j, i));
      }
    }
  }
  setHeight(nHeight: number) {
    this.l.setHeight(nHeight);

    this.clear();
  }

  setWidth(nWidth: number): Canvas {
    this.l.setWidth(nWidth);

    this.clear();

    return this;
  }

  // where painting may happen; cells outside it are left alone. null
  // paints anywhere. The renderer sets it per component (clipBounds()) and
  // clears it when the frame is done
  private _clip: LayoutBounds | null = null;

  clip() {
    return this._clip;
  }
  setClip(bounds: LayoutBounds | null) {
    this._clip = bounds;
    return this;
  }

  private clipped(x: number, y: number) {
    const clip = this._clip;
    return (
      clip !== null &&
      (x < clip.x ||
        y < clip.y ||
        x >= clip.x + clip.width ||
        y >= clip.y + clip.height)
    );
  }

  // every paint goes through here, so outside the clip there is no cell
  getCell(x: number, y: number) {
    if (this.clipped(x, y)) {
      return;
    }
    try {
      return this.canvas[y][x];
    } catch (err) {
      return;
    }
  }
  clear() {
    if (
      this.canvas.length !== this.height() ||
      this.canvas[0]?.length !== this.width()
    ) {
      this.resetCanvas();
      return;
    }

    for (const row of this.canvas) {
      for (const cell of row) {
        cell.setStyles(DEFAULT_STYLE);
      }
    }
  }

  public renderBoard() {
    // util function to render the map in tests

    console.log(
      this.canvas
        .map((line, ind) => {
          return line
            .map(
              (ch) =>
                `${ch.styles.backgroundColor()}${ch.styles.color()}${ch.styles.display()}`,
            )
            .join("");
        })
        .join("\n"),
    );
    console.log(colors.BACKGROUND_OFF);
  }
  setCell(x: number, y: number, style: ComponentStyle) {
    if (this.clipped(x, y)) {
      return;
    }
    this.canvas[y][x].setStyles(style);
  }

  fillRect(bounds: LayoutBounds, style: ComponentStyle | null) {
    const height = Math.round(bounds.y + bounds.height);
    const width = Math.round(bounds.x + bounds.width);

    // one style for the whole rectangle: cells are only ever given a new
    // style, never changed in place, so they can share it (clear() shares
    // DEFAULT_STYLE the same way). Blending per cell made a frame allocate
    // thousands of styles
    const filled = ComponentStyle.Blend(style, DEFAULT_STYLE);

    for (let y = Math.round(bounds.y); y < height; y++) {
      for (let x = Math.round(bounds.x); x < width; x++) {
        const cell = this.getCell(x, y);
        if (!cell) {
          continue;
        }
        cell.setStyles(filled);
      }
    }
  }



  private paintContent(
    cl: LayoutBounds,
    text: TextLayout,
    styles?: ComponentStyle | null,
    viewport?: ViewPort,
  ) {
    if (cl.height <= 0) {
      return;
    }

    const bounds = cl.clone();

    const firstLine = viewport?.firstLine || 0;
    const lastLine =
      firstLine + Math.min(viewport?.visibleLines || text.height(), cl.height);

    for (let lineNumber = firstLine; lineNumber < lastLine; lineNumber++) {
      const line = text.getLineAt(lineNumber);
      if (!line) {
        continue;
      }

      const screenY = cl.y + (lineNumber - firstLine);

      this.drawText(
        bounds.setX(cl.x + line.x()).setY(screenY),
        line.content(),
        styles,
      );
    }
    bounds.dispose();
  }

  drawText(bounds: LayoutBounds, text: string | TextLayout): void;

  drawText(
    bounds: LayoutBounds,
    text: string | TextLayout,
    style: ComponentStyle | null | undefined,
    viewport?: ViewPort,
  ): void;

  drawText(
    bounds: LayoutBounds,
    text: string | TextLayout,
    style?: ComponentStyle | null,
    viewport?: ViewPort,
  ): void {
    // a TextLayout is already split into positioned lines, so it goes through
    // the viewport-aware path and each visible line comes back here as a string
    if (text instanceof TextLayout) {
      this.paintContent(bounds, text, style, viewport);
      return;
    }

    if (!text) {
      return;
    }

    const lines = text.split("\n");

    const tab_width = Configuration().tab_width;

    // the same for every character; only the cell under it changes
    const base = ComponentStyle.Blend(style, DEFAULT_STYLE);

    for (let lineOffset = 0; lineOffset < lines.length; lineOffset++) {
      const line = expandTabs(lines[lineOffset], tab_width);
      const y = Math.round(bounds.y + lineOffset);

      // Outside the drawing area vertically.
      if (y >= bounds.y + bounds.height) {
        break;
      }

      for (let i = 0; i < line.length; i++) {
        const x = Math.round(bounds.x + i);

        // Outside the drawing area horizontally.
        if (x >= bounds.x + bounds.width) {
          break;
        }

        const cell = this.getCell(x, y);

        if (!cell) {
          continue;
        }

        cell.setStyles(
          ComponentStyle.Blend(style ?? cell.styles, base).setDisplay(line[i]),
        );
      }
    }
    base.dispose();
  }
  getCells() {
    return this.canvas;
  }
}
// a tab is one buffer character but expands to multiple screen cells, so
// rendering and cursor placement need the expanded text / a column mapping
// rather than drawing the raw line 1:1
function expandTabs(line: string, tabWidth: number): string {
  let out = "";
  for (const ch of line) {
    if (ch === "\t") {
      out += " ".repeat(tabWidth - (out.length % tabWidth));
    } else {
      out += ch;
    }
  }
  return out;
}
