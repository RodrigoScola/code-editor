import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import { layoutAndPaint, screen, stripAnsi } from "../../../helpers/ui.js";

// The renderer keeps the last frame it sent. After the first frame, render()
// only sends the cells that changed, each run starting with an absolute
// cursor move (ESC[row;colH, 1-based). invalidate() and resizing the canvas
// make the next frame a full one again (after a resize the terminal content
// is gone anyway).

// root 10x2
// ├── label "hello"   (row 0)
// └── box, blue       (row 1)
function setup() {
  const { canvas, root } = screen(10, 2);
  const label = new DisplayComponent().setHeight(1).setContent("hello");
  const box = new DisplayComponent()
    .setHeight(1)
    .setBackgroundColor(colors.BLUE_BACKGROUND);
  root.addChildren([label, box]);

  const frames: string[] = [];
  const renderer = Renderer.Create(canvas).setOutput((frame) =>
    frames.push(frame),
  );

  const frame = () => {
    layoutAndPaint(root, canvas);
    renderer.build(root).render();
    return frames[frames.length - 1];
  };

  return { canvas, root, label, box, renderer, frame };
}

describe("diff rendering", () => {
  it("sends everything on the first frame", () => {
    const { frame } = setup();

    expect(stripAnsi(frame())).toContain("hello");
  });

  it("sends no characters when nothing changed", () => {
    const { frame } = setup();

    frame();

    expect(stripAnsi(frame())).eq("");
  });

  it("sends only the changed cell, with a cursor move to it", () => {
    const { frame, label } = setup();

    frame();
    label.setContent("hellx");
    const second = frame();

    expect(stripAnsi(second)).eq("x");
    expect(second).toContain("\x1b[1;5H");
  });

  it("sends cells whose style changed even if the character did not", () => {
    const { frame, box } = setup();

    frame();
    box.setBackgroundColor(colors.RED_BACKGROUND);
    const second = frame();

    expect(second).toContain(colors.RED_BACKGROUND);
    expect(second).toContain("\x1b[2;1H");
    expect(stripAnsi(second)).not.toContain("hello");
  });

  it("does not resend cells that only changed and then changed back", () => {
    const { frame, label, renderer, canvas, root } = setup();

    frame();
    // painted but never rendered, so the terminal never saw it
    label.setContent("jello");
    layoutAndPaint(root, canvas);
    renderer.build(root);
    label.setContent("hello");

    expect(stripAnsi(frame())).eq("");
  });

  it("invalidate() makes the next frame a full one", () => {
    const { frame, renderer } = setup();

    frame();
    renderer.invalidate();

    expect(stripAnsi(frame())).toContain("hello");
  });

  it("resizing the canvas makes the next frame a full one", () => {
    const { frame, canvas, root } = setup();

    frame();
    canvas.setLayout(LayoutEngine.CreateBounds(12, 2));
    root.setLayout(LayoutEngine.CreateBounds(12, 2));

    expect(stripAnsi(frame())).toContain("hello");
  });
});

describe("painting allocations", () => {
  // every cell painted with the same style should point at one shared style
  // object, not a fresh copy per cell per frame
  it("cells filled with the same style share one style object", () => {
    const { canvas, root } = screen(40, 10);
    root.setBackgroundColor(colors.BLUE_BACKGROUND);
    root.addChildren(
      new DisplayComponent()
        .setHeight(5)
        .setBackgroundColor(colors.RED_BACKGROUND),
    );

    layoutAndPaint(root, canvas);

    const styles = new Set(canvas.getCells().flat().map((tile) => tile.styles));

    // one for the red half, one for the blue half (a couple spare)
    expect(styles.size).toBeLessThanOrEqual(4);
  });
});
