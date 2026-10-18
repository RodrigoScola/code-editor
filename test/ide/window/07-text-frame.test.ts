import { describe, expect, it } from "vitest";
import colors from "../../../src/ui/colors.js";
import { LayoutBounds } from "../../../src/ui/layout/LayoutBounds.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { vim } from "../harness.js";
import { cellCanvas, FakeWindow, paint, style } from "./helpers.js";

// Level 7: the rest of the Renderer interface, which TerminalRenderer has
// too, so the editor can use either one:
//
//   build(root)  paints the component tree into the cell canvas, exactly as
//                TerminalRenderer.build does (backgrounds, borders,
//                scrollbars, text, the cursor). Returns the renderer.
//   frame()      the canvas as plain text: one line of characters per row,
//                rows joined by "\r\n", no escape codes. ide.screen() and
//                the other text helpers read it, so specs work the same with
//                either renderer.
//
// Neither one draws to the window; only render() does.

function renderer(columns: number, rows: number, window = new FakeWindow()) {
  return new WindowRenderer(cellCanvas(columns, rows), window);
}

describe("frame(): the canvas as text", () => {
  it("a blank canvas is rows of spaces", () => {
    expect(renderer(3, 2).frame()).eq("   \r\n   ");
  });

  it("painted text is in its row and column", () => {
    const r = renderer(4, 2);
    paint(r.canvas(), 1, 1, "hi", style());

    expect(r.frame()).eq("    \r\n hi ");
  });

  it("has no escape codes, whatever the colors", () => {
    const r = renderer(4, 1);
    paint(
      r.canvas(),
      0,
      0,
      "ab",
      style()
        .setBackgroundColor(colors.BLUE)
        .setColor(colors.RED)
        .setBold(true),
    );

    expect(r.frame()).eq("ab  ");
  });

  it("follows setLayout()", () => {
    const r = renderer(2, 1);
    r.setLayout(LayoutBounds.Create(5, 3));

    expect(r.frame().split("\r\n")).toEqual(["     ", "     ", "     "]);
  });

  it("doesn't draw to the window", () => {
    const window = new FakeWindow();
    renderer(3, 2, window).frame();

    expect(window.renders).toHaveLength(0);
  });
});

describe("build(root): painting the editor's components", () => {
  // the harness editor is 40 x 10 cells and uses the TerminalRenderer;
  // building its tree with a WindowRenderer must give the same screen
  it("paints the same screen as the terminal renderer", () => {
    const ide = vim("hello |world\nsecond line");
    const terminal = ide.screen();

    const r = renderer(40, 10);
    r.build(ide.rootWindow);
    const rows = r.frame().split("\r\n");

    expect(rows).toHaveLength(terminal.length);
    // all but the last row: the status line shows the memory in use, which
    // changes from one paint to the next
    expect(rows.slice(0, -1)).toEqual(terminal.slice(0, -1));
    expect(rows.at(-1)).toMatch(/^mode: normal/);
  });

  it("returns the renderer", () => {
    const ide = vim("|abc");
    ide.screen();
    const r = renderer(40, 10);

    expect(r.build(ide.rootWindow)).toBe(r);
  });

  it("paints the colors too: the cells have the terminal renderer's styles", () => {
    const ide = vim("|abc");
    ide.screen();
    const expected = ide.renderer.layout(); // 40 x 10
    const r = renderer(expected.width, expected.height);
    r.build(ide.rootWindow);

    const terminalCells = (ide.renderer as any).canvas().getCells();
    const windowCells = r.canvas().getCells();
    for (let y = 0; y < expected.height; y++) {
      for (let x = 0; x < expected.width; x++) {
        const a = terminalCells[y][x].styles;
        const b = windowCells[y][x].styles;
        expect(b.backgroundColor(), `background at ${x},${y}`).eq(
          a.backgroundColor(),
        );
        expect(b.color(), `color at ${x},${y}`).eq(a.color());
        expect(b.isInverse(), `inverse at ${x},${y}`).eq(a.isInverse());
      }
    }
  });

  it("a second build starts from a clean canvas", () => {
    const ide = vim("|abc");
    ide.screen();
    const r = renderer(40, 10);
    paint(r.canvas(), 0, 9, "leftover", style());
    r.build(ide.rootWindow);

    expect(r.frame()).not.toContain("leftover");
  });

  it("doesn't draw to the window", () => {
    const ide = vim("|abc");
    ide.screen();
    const window = new FakeWindow();
    renderer(40, 10, window).build(ide.rootWindow);

    expect(window.renders).toHaveLength(0);
  });

  it("render() after build() shows the built screen in the window", () => {
    const ide = vim("|abc");
    ide.screen();
    const window = new FakeWindow();
    const r = renderer(40, 10, window);
    r.build(ide.rootWindow).render();

    expect(window.renders).toHaveLength(1);
  });
});
