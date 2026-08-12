import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../components.js";
import { LayoutEngine } from "./layout.js";
import { Renderer } from "../renderer.js";
import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { assert } from "../../assert.js";
import { ComponentStyle } from "../ComponentStyles.js";

describe("LayoutEngine measurement", () => {
  it("should create a canvas then assign 80 by 80, create a component and assign two children and their heights be 40 and width be 80", () => {
    const l = LayoutEngine.CreateBounds();
    l.height = l.width = 80;

    const root = new DisplayComponent().setLayout(l);

    root.addChildren([new DisplayComponent(), new DisplayComponent()]);
    LayoutEngine.Measure(root, root.contentLayout());

    const h = l.height;
    const w = l.width;

    for (const child of root.children()) {
      expect(child.parent(), `parent is not defined?`).toBeDefined();

      expect(
        child.contentLayout().height,
        `height is not being properly displayed?, expected ${h / 2}, got ${child.contentLayout().height}`,
      ).toEqual(h / 2);

      expect(
        child.contentLayout().width,
        `width is not being properly displayed?, expected ${w}, got ${child.contentLayout().width}`,
      ).toEqual(w);
    }
  });

  it("should create a canvas then assign 80 by 80, create a component and assign two children and their heights be 40 and width be 80", () => {
    const h = 80;
    const w = 80;
    const layout = LayoutEngine.CreateBounds();
    layout.width = layout.height = 80;

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .addChildren(new DisplayComponent())
      .addChildren(new DisplayComponent());

    LayoutEngine.Measure(root, root.contentLayout());

    for (const child of root.children()) {
      expect(child.parent(), `parent is not defined?`).toBeDefined();
      expect(
        child.contentLayout().height,
        `height is not being properly displayed?, expected ${h}, got ${child.contentLayout().height}`,
      ).toEqual(h);
      expect(
        child.contentLayout().width,
        `width is not being properly displayed?, expected ${w / 2}, got ${child.contentLayout().width}`,
      ).toEqual(w / 2);
    }
  });

  it("tests the padding on the component", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 3;

    const root = new DisplayComponent().setLayout(layout);

    const square = new DisplayComponent()
      .setPadding({
        left: 1,
        right: 1,
        top: 1,
        bottom: 1,
      })
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
      );

    root.addChildren(square);
    LayoutEngine.Measure(root, root.contentLayout());
    const cnv = new Canvas().setLayout(layout);
    Renderer.Create().build(root, cnv);

    const cell = cnv.getCell(2, 2);
    assert(cell, "invalid cell at x: 2 y : 2");

    expect(cell.styles.backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });
});
