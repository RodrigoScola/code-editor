import { Canvas } from "../../../../src/ui/canvas.js";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { DisplayLike, LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { TerminalRenderer } from "../../../../src/ui/TerminalRenderer.js";

// Shared by the css specs. Colors are read back from what the terminal
// renderer actually sends, so the specs don't depend on how a style stores
// them:
//
//   "#rrggbb"     a 24-bit color (ESC[48;2;r;g;bm / ESC[38;2;r;g;bm)
//   "\x1b[44m"    an ANSI palette color, as sent
//   null          the terminal's default color

// a root that fills a canvas of the given size, ready to take children
export function screen(width: number, height = 1) {
  const canvas = new Canvas().setLayout(LayoutEngine.CreateBounds(width, height));
  const root = new DisplayComponent().setLayout(
    LayoutEngine.CreateBounds(width, height),
  );
  return { canvas, root };
}

// a fixed-size box; content optional
export function box(width: number, height = 1, content?: string) {
  const component = new DisplayComponent().setWidth(width).setHeight(height);
  if (content !== undefined) {
    component.setContent(content);
  }
  return component;
}

// one full frame: measure, arrange, paint. Returns what was painted
export function paint(root: DisplayLike, canvas: Canvas) {
  const { width, height } = canvas.layout();
  LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(width, height));
  LayoutEngine.Arrange(root);
  new TerminalRenderer(canvas).build(root);
  return painted(canvas);
}

export type PaintedCell = {
  char: string;
  background: string | null;
  color: string | null;
};

// every cell as the terminal would show it, [row][column]
export function painted(canvas: Canvas): PaintedCell[][] {
  const frame = new TerminalRenderer(canvas).frame();
  const rows: PaintedCell[][] = [];

  let background: string | null = null;
  let color: string | null = null;

  for (const line of frame.split("\r\n")) {
    const row: PaintedCell[] = [];
    const tokens = line.split(/(\x1b\[[0-9;]*m)/);

    for (const token of tokens) {
      if (token === "") continue;

      const sgr = /^\x1b\[([0-9;]*)m$/.exec(token);
      if (!sgr) {
        for (const char of token) {
          row.push({ char, background, color });
        }
        continue;
      }

      const params = sgr[1] === "" ? [0] : sgr[1].split(";").map(Number);
      for (let i = 0; i < params.length; i++) {
        const p = params[i];
        if (p === 0) {
          background = null;
          color = null;
        } else if (p === 39) {
          color = null;
        } else if (p === 49) {
          background = null;
        } else if ((p === 38 || p === 48) && params[i + 1] === 2) {
          const hex = toHex(params[i + 2], params[i + 3], params[i + 4]);
          if (p === 38) color = hex;
          else background = hex;
          i += 4;
        } else if ((p === 38 || p === 48) && params[i + 1] === 5) {
          const code = `\x1b[${p};5;${params[i + 2]}m`;
          if (p === 38) color = code;
          else background = code;
          i += 2;
        } else if ((p >= 30 && p <= 37) || (p >= 90 && p <= 97)) {
          color = `\x1b[${p}m`;
        } else if ((p >= 40 && p <= 47) || (p >= 100 && p <= 107)) {
          background = `\x1b[${p}m`;
        }
        // anything else is an attribute (bold, underline, ...)
      }
    }
    if (row.length !== canvas.width()) {
      throw new Error(
        `row ${rows.length} came out ${row.length} cells wide on a ` +
          `${canvas.width()}-wide canvas: a color was sent as text ` +
          `(${JSON.stringify(row.map((c) => c.char).join(""))}). Hex and ` +
          `rgb() colors need the terminal renderer to send them as ` +
          `ESC[48;2;r;g;bm: test/unit/ui/styles/truecolor.test.ts`,
      );
    }
    rows.push(row);
  }
  return rows;
}

export function toHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

// the backgrounds of one painted row
export function backgrounds(cells: PaintedCell[][], row = 0) {
  return cells[row].map((cell) => cell.background);
}

// the characters of one painted row
export function chars(cells: PaintedCell[][], row = 0) {
  return cells[row].map((cell) => cell.char).join("");
}
