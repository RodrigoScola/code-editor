import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { backgrounds, box, chars, paint, screen } from "./helpers.js";

// Level 7: see-through colors and opacity. A terminal cell has one color, so
// "see-through" means the engine blends (blendColors, level 2) with what was
// painted under the cell, and sends the result.
//
//   setBackgroundColor("rgba(255, 255, 255, 0.5)")  /  "#ffffff80"
//   setColor(...) with alpha          text blended over its cell's background
//   setOpacity(n) / opacity()         CSS opacity: the component and everything
//                                     in it, blended over what's behind,
//                                     0-1 (clamped), 1 by default
//
// Every scene here: a black root, a child two cells wide on the left.

function scene(child: (c: any) => void, rootColor = "#000000") {
  const { canvas, root } = screen(4, 1);
  root.setDirection("horizontal").setBackgroundColor(rootColor);
  const c = box(2, 1) as any;
  child(c);
  root.addChildren(c);
  return paint(root, canvas);
}

describe("see-through background colors", () => {
  it("rgba() is blended with what's under it", () => {
    const cells = scene((c) => c.setBackgroundColor("rgba(255, 255, 255, 0.5)"));
    expect(backgrounds(cells)).toEqual(["#808080", "#808080", "#000000", "#000000"]);
  });

  it("#rrggbbaa", () => {
    const cells = scene((c) => c.setBackgroundColor("#ffffff80"));
    expect(backgrounds(cells).slice(0, 2)).toEqual(["#808080", "#808080"]);
  });

  it("transparent shows what's under it", () => {
    const cells = scene((c) => c.setBackgroundColor("transparent"), "#123456");
    expect(backgrounds(cells)[0]).eq("#123456");
  });

  it("blends with a gradient under it, cell by cell", () => {
    const { canvas, root } = screen(2, 1);
    (root as any).setBackgroundImage("linear-gradient(to right, #000000, #ffffff)");
    root.addChildren(box(2, 1).setBackgroundColor("rgba(255, 0, 0, 0.5)"));

    // #404040 and #bfbfbf under half red
    expect(backgrounds(paint(root, canvas))).toEqual(["#a02020", "#df6060"]);
  });

  // each layer is painted into the cell, as a whole-number color, before the
  // next one blends over it: 128, then 128 + 255/2 = 191.5 -> 192
  it("stacks: two half-white layers over black", () => {
    const { canvas, root } = screen(2, 1);
    root.setBackgroundColor("#000000");
    const outer = box(2, 1).setBackgroundColor("rgba(255, 255, 255, 0.5)");
    outer.addChildren(box(2, 1).setBackgroundColor("rgba(255, 255, 255, 0.5)"));
    root.addChildren(outer);

    expect(backgrounds(paint(root, canvas))[0]).eq("#c0c0c0");
  });
});

describe("see-through text colors", () => {
  it("are blended over the cell's background", () => {
    const cells = scene((c) =>
      c.setContent("ab").setColor("rgba(255, 255, 255, 0.5)"),
    );
    expect(cells[0][0].color).eq("#808080");
  });

  it("over a colored background", () => {
    const cells = scene((c) =>
      c
        .setContent("ab")
        .setBackgroundColor("#0000ff")
        .setColor("rgba(255, 255, 255, 0.5)"),
    );
    expect(cells[0][0].color).eq("#8080ff");
  });
});

describe("opacity", () => {
  it("is 1 by default", () => {
    expect((new DisplayComponent() as any).opacity()).eq(1);
  });

  it("is clamped to 0-1", () => {
    const component = new DisplayComponent() as any;
    expect(component.setOpacity(2).opacity()).eq(1);
    expect(component.setOpacity(-1).opacity()).eq(0);
  });

  it("blends the background with what's behind", () => {
    const cells = scene((c) => c.setBackgroundColor("#ffffff").setOpacity(0.5));
    expect(backgrounds(cells)).toEqual(["#808080", "#808080", "#000000", "#000000"]);
  });

  it("blends the text too", () => {
    const cells = scene((c) =>
      c.setBackgroundColor("#ffffff").setColor("#ffffff").setContent("ab").setOpacity(0.5),
    );
    expect(cells[0][0].color).eq("#808080");
  });

  it("applies to everything inside the component", () => {
    const cells = scene((c) => {
      c.setOpacity(0.5);
      c.addChildren(box(2, 1).setBackgroundColor("#ffffff"));
    });
    expect(backgrounds(cells).slice(0, 2)).toEqual(["#808080", "#808080"]);
  });

  it("nested opacity multiplies", () => {
    const cells = scene((c) => {
      c.setOpacity(0.5);
      const inner = box(2, 1).setBackgroundColor("#ffffff") as any;
      inner.setOpacity(0.5);
      c.addChildren(inner);
    });
    expect(backgrounds(cells)[0]).eq("#404040");
  });

  it("0 paints nothing: no text, the background behind shows", () => {
    const cells = scene((c) =>
      c.setBackgroundColor("#ffffff").setContent("ab").setOpacity(0),
    );
    expect(chars(cells).slice(0, 2)).eq("  ");
    expect(backgrounds(cells)[0]).eq("#000000");
  });

  it("keeps its space in the layout", () => {
    const { canvas, root } = screen(4, 1);
    root.setDirection("horizontal");
    const faded = box(2, 1, "ab") as any;
    faded.setOpacity(0);
    root.addChildren([faded, box(2, 1, "cd")]);

    expect(chars(paint(root, canvas))).eq("  cd");
  });

  it("works with a see-through background: both apply", () => {
    const cells = scene((c) =>
      c.setBackgroundColor("rgba(255, 255, 255, 0.5)").setOpacity(0.5),
    );
    expect(backgrounds(cells)[0]).eq("#404040");
  });

  it("setting it repaints (marks the component dirty)", () => {
    const component = new DisplayComponent() as any;
    component.setDirty(false);
    component.setOpacity(0.5);
    expect(component.dirty()).eq(true);
  });
});
