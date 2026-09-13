import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/components.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import { Canvas } from "../../../../src/ui/canvas.js";
import colors from "../../../../src/ui/colors.js";
import { assert } from "../../../../src/assert.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";

describe("tests normal position mode", () => {
  it("components side by side", () => {
    const { root, build, cnv } = setupTests(10, 10);

    const left = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
      )
      .setWidth("50%")
      .setHeight("100%");

    const right = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
      )
      .setWidth("50%")
      .setHeight("100%");

    root.addChildren(left).addChildren(right).setDirection("horizontal");

    build(root, cnv);

    cnv.renderBoard();

    expect(left.contentLayout().width).eq(root.contentLayout().width / 2);
    expect(right.contentLayout().width).eq(root.contentLayout().width / 2);

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.MAGENTA_BACKGROUND,
    );
    expect(cnv.getCell(6, 0)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );
  });
  it("components side by side when one doesnt have width", () => {
    const { root, build, cnv } = setupTests(10, 10);

    const left = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
      )
      .setWidth("50%")
      .setHeight("100%");

    const right = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
      )
      .setHeight("100%");

    root.addChildren(left).addChildren(right).setDirection("horizontal");

    build(root, cnv);

    cnv.renderBoard();

    expect(left.contentLayout().width).eq(root.contentLayout().width / 2);
    expect(right.contentLayout().width).eq(root.contentLayout().width / 2);

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.MAGENTA_BACKGROUND,
    );
    expect(cnv.getCell(6, 0)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );
  });
});

describe("tests the absolute mode", () => {
  it("applies absolute parent padding to normal children", () => {
    const { root, build, cnv } = setupTests(20, 20);

    const child = new DisplayComponent()
      .setWidth("100%")
      .setHeight("100%")
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
      );
    const parent = new DisplayComponent()
      .setPositionMode("absolute")
      .setWidth(10)
      .setHeight(10)
      .setIndex(10)
      .setStartX(2)
      .setStartY(2)
      .setPadding({ left: 2, right: 0, top: 0, bottom: 0 })
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
      )
      .addChildren(child);

    root.addChildren(parent);
    build(root, cnv);

    expect(child.layout().x).toBe(4);
    expect(child.layout().y).toBe(2);
    expect(cnv.getCell(2, 2)?.styles.backgroundColor()).toBe(
      colors.YELLOW_BACKGROUND,
    );
    expect(cnv.getCell(4, 2)?.styles.backgroundColor()).toBe(
      colors.RED_BACKGROUND,
    );
  });

  it("can place anywhere ", () => {
    const { root, build, cnv } = setupTests(10, 10);

    const abs = new DisplayComponent()
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
      )
      .setName("absolute")
      .setPositionMode("absolute")
      .setName("abs")
      .setHeight(4)
      .setWidth(4)
      .setStartX(6)
      .setStartY(6);

    root
      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
        ),
      )
      .addChildren(abs)
      .setDirection("horizontal");

    const first = root.children().at(1);
    assert(first, "undefined abs");

    build(root, cnv);

    cnv.renderBoard();
    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.MAGENTA_BACKGROUND,
    );

    expect(cnv.getCell(6, 2)?.styles.backgroundColor()).eq(
      colors.MAGENTA_BACKGROUND,
    );
    expect(cnv.getCell(6, 6)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );
  });
  it("overlays the absoluted component on inverted order", () => {
    const { root, build, cnv } = setupTests(10, 10);

    root
      .addChildren(
        new DisplayComponent()
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(
              colors.YELLOW_BACKGROUND,
            ),
          )
          .setPositionMode("absolute")
          .setHeight(4)
          .setWidth(4)
          .setStartX(6)
          .setStartY(6),
      )

      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
        ),
      )
      .setDirection("horizontal");

    build(root, cnv);

    cnv.renderBoard();
    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.MAGENTA_BACKGROUND,
    );

    expect(cnv.getCell(6, 2)?.styles.backgroundColor()).eq(
      colors.MAGENTA_BACKGROUND,
    );
    expect(cnv.getCell(6, 6)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );
  });
  it("padding does not change an absolute component's outer position", () => {
    const { build, cnv, root } = setupTests(25, 25);

    const abs = new DisplayComponent()
      .setPositionMode("absolute")
      .setHeight("50%")
      .setWidth("70%")
      .setStartX("20%")
      .setStartY("20%");

    abs.styles().setBackgroundColor(colors.BRIGHT_BLUE_BACKGROUND);

    root.addChildAt(abs, 0);
    build(root, cnv);

    cnv.renderBoard();

    const outerBefore = { ...abs.layout() };
    const contentBefore = { ...abs.contentLayout() };

    abs.setPaddingLeft(3);
    build(root, cnv);

    cnv.renderBoard();

    expect(abs.layout().x).toBe(outerBefore.x);
    expect(abs.layout().y).toBe(outerBefore.y);
    expect(abs.layout().width).toBe(outerBefore.width + 3);
    expect(abs.layout().height).toBe(outerBefore.height);

    expect(abs.contentLayout().x).toBe(contentBefore.x + 3);
    expect(abs.contentLayout().y).toBe(contentBefore.y);
    expect(abs.contentLayout().width).toBe(contentBefore.width);

    const child = new DisplayComponent().setHeight("90%").setWidth("90%");

    child.styles().setBackgroundColor(colors.WHITE_BACKGROUND);
    abs.addChildren(child);

    build(root, cnv);
    cnv.renderBoard();
  });

  it("positions absolute children from the parent padding edge", () => {
    const { build, root, cnv } = setupTests(20, 20);

    const child = new DisplayComponent()
      .setPositionMode("absolute")
      .setWidth(2)
      .setHeight(2)
      .setStartX(0)
      .setStartY(0);
    const parent = new DisplayComponent()
      .setWidth(10)
      .setHeight(10)
      .setPadding({ left: 2, top: 3, right: 0, bottom: 0 })
      .addChildren(child);

    root.addChildren(parent);
    build(root, cnv);

    expect(child.layout().x).toBe(0);
    expect(child.layout().y).toBe(0);
  });
});

function setupTests(height: number = 10, width: number = 10) {
  const layout = LayoutEngine.CreateBounds();
  layout.height = height;
  layout.width = width;

  const root = new DisplayComponent().setLayout(layout);

  root.styles().setBackgroundColor(colors.MAGENTA_BACKGROUND);

  const cnv = new Canvas().setLayout(layout);

  return {
    layout,
    root,
    cnv,
    build: (root: DisplayComponent, canvas: Canvas) => {
      LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
      LayoutEngine.Arrange(root);

      Renderer.Create().build(root, canvas);
    },
  };
}
