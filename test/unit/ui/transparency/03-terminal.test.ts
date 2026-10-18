import { expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { TerminalRenderer } from "../../../../src/ui/Renderers/TerminalRenderer.js";
import {
  backgroundCodes,
  cells,
  fill,
  later,
  style,
  write,
} from "./helpers.js";

// Level 3: what the terminal gets. Parked: see helpers.ts.
//
// A terminal has no alpha: every color it gets is opaque, ESC[48;2;r;g;bm.
// Cells the canvas already blended (levels 1 and 2) are sent as they are.
// A cell still holding a see-through color ("#rrggbbaa": nothing opaque was
// under it) is blended by the renderer with the background it assumes the
// terminal has, since a program can't read that color:
//
//   renderer.setAssumedBackground(css) / renderer.assumedBackground()
//     "#1e1e1e" by default: VS Code's dark theme, the same default the window
//     renderer paints (test/ide/window/02-colors.test.ts)
//
// A cell that is fully transparent is the terminal's own background,
// ESC[49m, not a color.

function frame(canvas: ReturnType<typeof cells>, renderer?: TerminalRenderer) {
  const r = renderer ?? new TerminalRenderer(canvas);
  return (r as any).frame() as string;
}

later("3. the terminal gets opaque colors only", () => {
  it("a blended cell is sent as its 24-bit color", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    fill(
      canvas,
      0,
      0,
      1,
      1,
      style().setBackgroundColor("rgba(255, 255, 255, 0.5)"),
    );

    expect(frame(canvas)).toContain("\x1b[48;2;128;128;128m");
  });

  it("no CSS, no alpha reaches the terminal", () => {
    const canvas = cells(2);
    fill(
      canvas,
      0,
      0,
      1,
      1,
      style().setBackgroundColor("rgba(255, 255, 255, 0.5)"),
    );
    write(canvas, 1, 0, "x", style().setColor("rgba(255, 0, 0, 0.25)"));
    const sent = frame(canvas);

    expect(sent).not.toContain("#");
    expect(sent).not.toContain("rgba");
    for (const code of backgroundCodes(sent)) {
      // 48;2;r;g;b has exactly three channels, no fourth
      if (code.startsWith("\x1b[48;2;")) {
        expect(code.split(";")).toHaveLength(5);
      }
    }
  });

  it("a fully transparent cell is the terminal's own background", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("transparent"));

    expect(frame(canvas)).not.toContain("\x1b[48;2;");
  });
});

later("3. see-through over the terminal's own background", () => {
  it("is blended with the assumed background, #1e1e1e by default", () => {
    const canvas = cells(1);
    fill(
      canvas,
      0,
      0,
      1,
      1,
      style().setBackgroundColor("rgba(255, 255, 255, 0.5)"),
    );

    // 30 + (255 - 30) * 128/255 = 142.9 -> 143
    expect(frame(canvas)).toContain("\x1b[48;2;143;143;143m");
  });

  it("assumedBackground() is #1e1e1e by default", () => {
    expect((new TerminalRenderer(cells(1)) as any).assumedBackground()).eq(
      "#1e1e1e",
    );
  });

  it("setAssumedBackground() changes what it blends with", () => {
    const canvas = cells(1);
    fill(
      canvas,
      0,
      0,
      1,
      1,
      style().setBackgroundColor("rgba(255, 255, 255, 0.5)"),
    );
    const renderer = new TerminalRenderer(canvas) as any;
    renderer.setAssumedBackground("#000000");

    expect(frame(canvas, renderer)).toContain("\x1b[48;2;128;128;128m");
  });

  it("setAssumedBackground() returns the renderer", () => {
    const renderer = new TerminalRenderer(cells(1)) as any;
    expect(renderer.setAssumedBackground("#000000")).toBe(renderer);
  });

  it("see-through text over it too", () => {
    const canvas = cells(1);
    write(canvas, 0, 0, "x", style().setColor("rgba(255, 255, 255, 0.5)"));

    expect(frame(canvas)).toContain("\x1b[38;2;143;143;143m");
  });

  it("the canvas keeps the alpha: only what is sent is blended", () => {
    const canvas = cells(1);
    fill(
      canvas,
      0,
      0,
      1,
      1,
      style().setBackgroundColor("rgba(255, 255, 255, 0.5)"),
    );
    frame(canvas);

    expect(canvas.getCell(0, 0)!.styles.backgroundColor()).eq("#ffffff80");
  });
});

later("3. through the component tree", () => {
  // a black root with a half-white box over its left cell
  function scene() {
    const canvas = cells(2);
    const root = new DisplayComponent()
      .setLayout(LayoutEngine.CreateBounds(2, 1))
      .setBackgroundColor("#000000");
    const overlay = new DisplayComponent()
      .setPositionMode("absolute")
      .setStartX(0)
      .setStartY(0)
      .setWidth(1)
      .setHeight(1)
      .setBackgroundColor("rgba(255, 255, 255, 0.5)");
    root.addChildren(overlay);

    const renderer = new TerminalRenderer(canvas).setOutput(() => {});
    const draw = () => {
      LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(2, 1));
      LayoutEngine.Arrange(root);
      return renderer.build(root).render() as unknown as string;
    };
    return { root, draw };
  }

  it("the overlay's cell is the blend", () => {
    expect(scene().draw()).toContain("\x1b[48;2;128;128;128m");
  });

  it("when what's under it changes, the overlay's cell is sent again", () => {
    const { root, draw } = scene();
    draw();
    root.setBackgroundColor("#ff0000");

    // half white over red
    expect(draw()).toContain("\x1b[48;2;255;128;128m");
  });

  it("when nothing changed, nothing is sent", () => {
    const { draw } = scene();
    draw();
    expect(draw()).eq("");
  });
});
