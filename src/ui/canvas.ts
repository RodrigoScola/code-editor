import colors from "./colors.js";

const DEFAULT_STYLE: ComponentStyles = {
  backgroundColor: colors.BACKGROUND_OFF,
  color: colors.FOREGROUND_OFF,
};

export class Canvas {
  tab_width: number = 4;
  l: LayoutBounds = {
    x: 0,
    y: 0,
    height: 0,
    width: 0,
  };

  private canvas: DisplayTile[][];

  layout() {
    return this.l;
  }
  setLayout(nl: LayoutBounds) {
    this.l = nl;
    this.clear();
    return this;
  }

  constructor() {
    this.canvas = new Array();
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

  private createTile(x: number, y: number): DisplayTile {
    return {
      x: x,
      display: " ",
      y: y,
      styles: {
        backgroundColor: colors.BACKGROUND_OFF,
        color: colors.FOREGROUND_OFF,
      },
    };
  }
  private resetCanvas() {
    this.canvas = [];
    for (let i = 0; i < this.height(); i++) {
      this.canvas.push([]);
      for (let j = 0; j < this.width(); j++) {
        this.canvas[i].push(this.createTile(j, i));
      }
    }
  }
  setHeight(nHeight: number) {
    this.setLayout({
      height: nHeight,
      width: this.l.width,
      x: this.l.x,
      y: this.l.y,
    });

    this.clear();
  }

  setWidth(nWidth: number): Canvas {
    this.setLayout({
      height: this.l.height,
      width: nWidth,
      x: this.l.x,
      y: this.l.y,
    });

    this.clear();

    return this;
  }

  getCell(x: number, y: number) {
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
        cell.display = " ";
        cell.styles = DEFAULT_STYLE;
      }
    }
  }

  public renderCells() {
    // util function to render the map in tests

    console.log(
      this.canvas.map((line) => {
        return line.map(
          (ch) =>
            `${ch.styles.backgroundColor} ${ch.styles.color} ${ch.display}`,
        );
      }),
    );
  }

  fillRect(bounds: LayoutBounds, style: ComponentStyles | null) {
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        const cell = this.getCell(x, y);
        if (!cell) {
          continue;
        }
        cell.styles = blendStyles(style, DEFAULT_STYLE);
      }
    }
  }

  applyRelative(
    x: number,
    y: number,
    text: string,
    layout: LayoutBounds,
  ): LayoutBounds {
    return {
      height: 1,
      width: 1,
      x: layout.x + bufferColumnToScreenColumn(text, x, this.tab_width),
      y: layout.y + y,
    };
  }
  drawText(x: number, y: number, text: string, style: ComponentStyles | null) {
    text = expandTabs(text, this.tab_width);

    for (let i = 0; i < text.length; i++) {
      const cell = this.getCell(x + i, y);
      if (!cell) {
        break;
      }
      cell.display = text[i];

      cell.styles = blendStyles(cell.styles, blendStyles(style, DEFAULT_STYLE));
    }
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

export function blendStyles(
  first: ComponentStyles | undefined | null,
  parent: ComponentStyles | null | undefined,
): ComponentStyles {
  return {
    backgroundColor:
      first?.backgroundColor === colors.BACKGROUND_OFF
        ? parent?.backgroundColor || first.color
        : first?.backgroundColor || colors.BACKGROUND_OFF,
    color:
      first?.color === colors.BACKGROUND_OFF
        ? parent?.color || first.color
        : first?.color || colors.FOREGROUND_OFF,
  };
}

function bufferColumnToScreenColumn(
  line: string,
  column: number,
  tabWidth: number,
): number {
  let screenCol = 0;
  const limit = Math.min(column, line.length);
  for (let i = 0; i < limit; i++) {
    if (line[i] === "\t") {
      screenCol += tabWidth - (screenCol % tabWidth);
    } else {
      screenCol += 1;
    }
  }
  return screenCol + Math.max(0, column - line.length);
}
