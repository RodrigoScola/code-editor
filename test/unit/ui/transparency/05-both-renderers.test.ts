import { expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { TerminalRenderer } from "../../../../src/ui/TerminalRenderer.js";
import { cells, later, windowFor } from "./helpers.js";

// Level 5: a real use, through layout, in both renderers. Parked: see
// helpers.ts.
//
// A dialog over the editor: the screen behind it dimmed by a half-black
// backdrop, the text behind still readable, the dialog itself crisp. The
// terminal and the window must agree on every cell's color.
//
//   root     6 x 3, blue, white text "abcdef" on every row
//   backdrop absolute, the whole screen, rgba(0, 0, 0, 0.5)
//   dialog   absolute at (2, 1), 2 x 1, white, black text "ok"

function dialogScene() {
  const canvas = cells(6, 3);
  const root = new DisplayComponent()
    .setLayout(LayoutEngine.CreateBounds(6, 3))
    .setBackgroundColor("#2472c8")
    .setColor("#ffffff")
    .setContent("abcdef\nabcdef\nabcdef");

  const backdrop = new DisplayComponent()
    .setPositionMode("absolute")
    .setStartX(0)
    .setStartY(0)
    .setWidth(6)
    .setHeight(3)
    .setBackgroundColor("rgba(0, 0, 0, 0.5)");

  const dialog = new DisplayComponent()
    .setPositionMode("absolute")
    .setStartX(2)
    .setStartY(1)
    .setWidth(2)
    .setHeight(1)
    .setBackgroundColor("#ffffff")
    .setColor("#000000")
    .setContent("ok");

  root.addChildren([backdrop, dialog]);

  LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(6, 3));
  LayoutEngine.Arrange(root);
  const terminal = new TerminalRenderer(canvas).setOutput(() => {});
  terminal.build(root);

  return { canvas, terminal };
}

const at = (canvas: ReturnType<typeof cells>, x: number, y: number) => {
  const s = canvas.getCell(x, y)!.styles;
  return { char: s.display(), background: s.backgroundColor(), color: s.color() };
};

later("5. a dialog over a dimmed screen", () => {
  it("behind the backdrop: dimmed, text still there", () => {
    const { canvas } = dialogScene();

    expect(at(canvas, 0, 0)).toEqual({
      char: "a",
      background: "#123964",
      color: "#808080",
    });
  });

  it("every cell outside the dialog is dimmed", () => {
    const { canvas } = dialogScene();
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 6; x++) {
        if (y === 1 && (x === 2 || x === 3)) continue;
        expect(at(canvas, x, y).background, `${x},${y}`).eq("#123964");
      }
    }
  });

  it("the dialog is crisp: its own colors, not dimmed", () => {
    const { canvas } = dialogScene();

    expect(at(canvas, 2, 1)).toEqual({
      char: "o",
      background: "#ffffff",
      color: "#000000",
    });
    expect(at(canvas, 3, 1).char).eq("k");
  });

  it("the terminal gets the dimmed and the crisp colors", () => {
    const { terminal } = dialogScene();
    const sent = (terminal as any).frame() as string;

    expect(sent).toContain("\x1b[48;2;18;57;100m");
    expect(sent).toContain("\x1b[48;2;255;255;255m");
    expect(sent.replace(/\x1b\[[0-9;]*m/g, "").split("\r\n")).toEqual([
      "abcdef",
      "abokef",
      "abcdef",
    ]);
  });

  it("the window paints the same color as the terminal in every cell", async () => {
    const { canvas } = dialogScene();
    const { renderer, window } = await windowFor(canvas);
    renderer.render();
    const frame = window.lastFrame();

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 6; x++) {
        const corner = frame.pixel(x * renderer.cellWidth(), y * renderer.cellHeight());
        expect(corner, `${x},${y}`).eq(at(canvas, x, y).background);
      }
    }
  });
});
