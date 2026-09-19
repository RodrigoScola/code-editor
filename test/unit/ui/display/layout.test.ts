import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/components.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import { Canvas } from "../../../../src/ui/canvas.js";
import colors from "../../../../src/ui/colors.js";
import { assert } from "../../../../src/assert.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";

describe("LayoutEngine measurement", () => {
  it("should create a canvas then assign 80 by 80, create a component and assign two children and their heights be 40 and width be 80", () => {
    const l = LayoutEngine.CreateBounds();
    l.height = l.width = 80;

    const root = new DisplayComponent().setLayout(l);

    root.addChildren([new DisplayComponent(), new DisplayComponent()]);
    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(l.width)).Arrange(
      root,
    );

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
    const h = 10;
    const w = 10;
    const layout = LayoutEngine.CreateBounds(w, h);

    const cnv = new Canvas().setLayout(layout);

    const first = new DisplayComponent();

    first.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);

    const root = new DisplayComponent()
      .setDirection("horizontal")
      .addChildren(first)
      .addChildren(new DisplayComponent());

    root.styles().setBackgroundColor(colors.RED_BACKGROUND);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(w));
    LayoutEngine.Arrange(root, layout);

    Renderer.Create().build(root, cnv);

    cnv.renderBoard();

    for (const child of root.children()) {
      expect(child.parent()).toBeDefined();

      expect(child.layout().height).toEqual(h);
      expect(child.layout().width).toEqual(w / 2);
    }
  });

  it("tests the padding on the component", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 20;

    const root = new DisplayComponent().setLayout(layout);

    root.styles()?.setBackgroundColor(colors.RED_BACKGROUND);

    const parent = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
      )
      .setPadding({ left: 3, right: 1, top: 1, bottom: 1 });

    const child = new DisplayComponent().setHeight("100%").setWidth("100%");

    child.styles().setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND);

    child.setPadding({ left: 1, right: 1, top: 1, bottom: 1 });
    child.setMargin({ left: 1, right: 1, top: 0, bottom: 0 });

    root.addChildren(parent.addChildren(child));
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);

    const cnv = new Canvas().setLayout(layout);
    Renderer.Create().build(root, cnv);

    cnv.renderBoard();
  });

  it("uses content-box sizing for explicit dimensions", () => {
    const root = new DisplayComponent().setLayout(
      LayoutEngine.CreateBounds(20),
    );
    const child = new DisplayComponent()
      .setWidth(5)
      .setHeight(4)
      .setPadding({ left: 2, right: 1, top: 1, bottom: 2 });

    root.addChildren(child);
    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(20)).Arrange(
      root,
    );

    expect(child.layout()).toEqual({
      x: 0,
      y: 0,
      width: 8,
      height: 7,
    });
    expect(child.contentLayout()).toEqual({
      x: 2,
      y: 1,
      width: 5,
      height: 4,
    });
  });

  it("keeps root padding outside normal-flow children", () => {
    const root = new DisplayComponent()
      .setLayout(LayoutEngine.CreateBounds(10))
      .setPadding({ left: 2, right: 1, top: 1, bottom: 2 });
    const child = new DisplayComponent();

    root.addChildren(child);
    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(10)).Arrange(
      root,
    );

    expect(child.layout()).toEqual({
      x: 2,
      y: 1,
      width: 7,
      height: 7,
    });
  });

  it("keeps margins outside an explicit child box", () => {
    const root = new DisplayComponent()
      .setLayout(LayoutEngine.CreateBounds(20))
      .setDirection("horizontal");
    const first = new DisplayComponent()
      .setWidth(4)
      .setMargin({ left: 1, right: 2, top: 0, bottom: 0 });
    const second = new DisplayComponent();

    root.addChildren(first).addChildren(second);
    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(20)).Arrange(
      root,
    );

    expect(first.layout().x).toBe(1);
    expect(first.layout().width).toBe(4);
    expect(second.layout().x).toBe(7);
  });

  it("uses content-box max dimensions", () => {
    const root = new DisplayComponent().setLayout(
      LayoutEngine.CreateBounds(20),
    );
    const child = new DisplayComponent()
      .setMaxWidth(5)
      .setPadding({ left: 2, right: 1, top: 0, bottom: 0 });

    root.addChildren(child);
    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(20)).Arrange(
      root,
    );

    expect(child.layout().width).toBe(8);
    expect(child.contentLayout().width).toBe(5);
  });

  it("absolute and padding doesnt take up all of the screen", () => {
    const layout = LayoutEngine.CreateBounds(20);
    const cnv = new Canvas().setLayout(layout);

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
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);

    Renderer.Create().build(root, cnv);

    cnv.renderBoard();
  });
});
describe("tests the invisible of component", () => {
  it("if invisible should not show or be calculated", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const root = new DisplayComponent().setLayout(layout);

    const right = new DisplayComponent()
      .setVisible(false)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
      );

    root
      .addChildren(
        new DisplayComponent()
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(
              colors.YELLOW_BACKGROUND,
            ),
          )
          .setWidth("100%")
          .setHeight("100%"),
      )
      .addChildren(right);
    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    const cnv = new Canvas().setLayout(layout);
    Renderer.Create().build(root, cnv);

    cnv.renderBoard();

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
          .setHeight(layout.height)
          .setWidth(layout.width)
          .setStartX(0)
          .setStartY(layout.height / 2)
          .setVisible(true)
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
          ),
      );
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);

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
    const layout = LayoutEngine.CreateBounds(10);

    const root = new DisplayComponent().setLayout(layout);

    root.styles().setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND);

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

    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);

    Renderer.Create().build(root, cnv);

    cnv.renderBoard();

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );

    expect(cnv.getCell(0, layout.height - 1)?.styles.backgroundColor()).eq(
      colors.BRIGHT_BLUE_BACKGROUND,
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

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(10));
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

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(10));
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });

  it("when gap is explicit, should be applied", () => {
    const layout = LayoutEngine.CreateBounds(20, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .setGap(2);
    root.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);
    const left = new DisplayComponent().setWidth(6).setHeight(6);
    left.styles().setBackgroundColor(colors.RED_BACKGROUND);

    const right = new DisplayComponent().setWidth(6).setHeight(6);
    right.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.addChildren(left);
    root.addChildren(right);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();

    expect(right.layout().x).eq(
      left.layout().x + left.layout().width + root.gap(),
    );
  });
});
