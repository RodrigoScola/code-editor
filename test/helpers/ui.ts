import { Canvas } from "../../src/ui/canvas.js";
import { DisplayComponent } from "../../src/ui/display/displayComponent.js";
import { DisplayLike, LayoutEngine } from "../../src/ui/layout/layout.js";
import { TerminalRenderer as Renderer } from "../../src/ui/TerminalRenderer.js";

// a root that fills a canvas of the given size, ready to take children
export function screen(width: number, height: number = width) {
  const bounds = LayoutEngine.CreateBounds(width, height);
  const canvas = new Canvas().setLayout(bounds);
  const root = new DisplayComponent().setLayout(
    LayoutEngine.CreateBounds(width, height),
  );

  return { canvas, root };
}

// one full frame: measure, arrange, paint
export function layoutAndPaint(root: DisplayLike, canvas: Canvas) {
  const { width, height } = canvas.layout();

  LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(width, height));
  LayoutEngine.Arrange(root);
  Renderer.Create(canvas).build(root);

  return canvas;
}

// prints the painted canvas with its colors inside a border, like ide.show():
//   layoutAndPaint(root, canvas);
//   show(canvas, "after scrolling");
export function show(canvas: Canvas, label = "screen") {
  const rows = Renderer.Create(canvas).frame().split("\r\n");
  const border = "─".repeat(canvas.width());

  // straight to stdout: vitest's reporters can swallow console.log from
  // tests that pass
  process.stdout.write(
    [
      label,
      `┌${border}┐`,
      ...rows.map((row) => `│${row}\x1b[0m│`),
      `└${border}┘`,
    ].join("\n") + "\n",
  );
  return canvas;
}

export function cell(canvas: Canvas, x: number, y: number) {
  const found = canvas.getCell(x, y);

  if (!found) {
    throw new Error(`no cell at x:${x}, y:${y}`);
  }
  return found.styles;
}

// the characters on one row, without trimming
export function rowText(canvas: Canvas, y: number) {
  return canvas
    .getRow(y)!
    .map((tile) => tile.styles.display())
    .join("");
}

// every row, right-trimmed, joined by newlines
export function screenText(canvas: Canvas) {
  return canvas
    .getCells()
    .map((row) =>
      row
        .map((tile) => tile.styles.display())
        .join("")
        .trimEnd(),
    )
    .join("\n");
}

export function stripAnsi(text: string) {
  return text.replace(/\x1b\[[0-9;?<>]*[A-Za-z]/g, "");
}

export function key(token: string): KeyEvent {
  return { token, ctrl: false, alt: false, shift: false };
}
