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

    root.styles()?.setBackgroundColor(colors.RED_BACKGROUND);

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

    cnv.renderBoard();

    const cell = cnv.getCell(1, 1);
    assert(cell, "invalid cell at x: 2 y : 2");

    expect(cell.styles.backgroundColor()).eq(colors.YELLOW_BACKGROUND);
  });

  it("absolute and padding doesnt take up all of the screen", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 20;

    const root = new DisplayComponent().setLayout(layout);

    root
      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
        ),
      )
      .addChildren(
        new DisplayComponent()
          .setPositionMode("absolute")
          .setIndex(2)
          .setLayout(layout)
          .setPadding({ bottom: 4, top: 4, left: 1, right: 1 })
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
          ),
      )
      .setDirection("vertical");
    LayoutEngine.Measure(root, root.contentLayout());
    const cnv = new Canvas().setLayout(layout);
    Renderer.Create().build(root, cnv);

    cnv.renderBoard();
  });
});
describe("tests the invisible of component", () => {
  it("if invisible should not show or be calculated", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const root = new DisplayComponent().setLayout(layout);

    root
      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
        ),
      )
      .addChildren(
        new DisplayComponent()
          .setVisible(false)
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
          ),
      );
    LayoutEngine.Measure(root, root.contentLayout());
    const cnv = new Canvas().setLayout(layout);
    Renderer.Create().build(root, cnv);

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );

    expect(cnv.getCell(0, layout.height - 1)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );
  });
  it("should keep the layout set on absolute", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const root = new DisplayComponent().setLayout(layout);

    root
      .addChildren(
        new DisplayComponent()
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(
              colors.YELLOW_BACKGROUND,
            ),
          )
          .setName("first"),
      )
      .addChildren(
        new DisplayComponent()
          .setPositionMode("absolute")
          .setName("absolute")
          .setLayout({
            height: layout.height,
            width: layout.width,
            x: 0,
            y: layout.height / 2,
          })
          .setVisible(true)
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
          ),
      );
    LayoutEngine.Measure(root, root.layout());
    const cnv = new Canvas().setLayout(layout);
    Renderer.Create().build(root, cnv);

    cnv.renderBoard();

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );

    expect(cnv.getCell(0, layout.height - 1)?.styles.backgroundColor()).eq(
      colors.RED_BACKGROUND,
    );
  });
});
describe("tests the margin", () => {
  it("has margin on default behaviour", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const root = new DisplayComponent().setLayout(layout);

    root
      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
        ),
      )
      .addChildren(
        new DisplayComponent()
          .setMargin({
            left: 2,
            right: 0,
            top: 0,
            bottom: 0,
          })
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
          ),
      )
      .setDirection("vertical");
    const cnv = new Canvas().setLayout(layout);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.Create().build(root, cnv);

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );

    expect(cnv.getCell(0, layout.height - 1)?.styles.backgroundColor()).eq(
      colors.BACKGROUND_OFF,
    );

    cnv.renderBoard();
    expect(cnv.getCell(2, layout.height - 1)?.styles.backgroundColor()).eq(
      colors.RED_BACKGROUND,
    );
  });
});

describe("tests the relative height and width", () => {
  it("can understand relative width of 30%", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal");
    const canvas = new Canvas().setLayout(layout);

    const oneThird = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(
          colors.BRIGHT_RED_BACKGROUND,
        ),
      )
      .setWidth("30%");

    const rest = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND),
    );

    root.addChildren(oneThird).addChildren(rest);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });

  it("can understand relative height of 30%", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("vertical");
    const canvas = new Canvas().setLayout(layout);

    const oneThird = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(
          colors.BRIGHT_RED_BACKGROUND,
        ),
      )
      .setHeight("30%");

    const rest = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND),
    );

    root.addChildren(oneThird).addChildren(rest);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });
});
