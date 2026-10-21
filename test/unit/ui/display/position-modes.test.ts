import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { TerminalRenderer as Renderer } from "../../../../src/ui/Renderers/TerminalRenderer.js";
import { TerminalCanvas } from "../../../../src/ui/Canvas/TerminalCanvas.js";
import colors from "../../../../src/ui/colors/colors.js";
import { assert } from "../../../../src/assert.js";
import { ComponentStyle } from "../../../../src/ui/styles/ComponentStyles.js";

describe("tests normal position mode", () => {
  it("components side by side", () => {
    const { root, build, cnv } = setupTests(10, 10);

    const left = new DisplayComponent()
      .setStyles(ComponentStyle.Create().setBackgroundColor(colors.MAGENTA))
      .setWidth("50%")
      .setHeight("100%");

    const right = new DisplayComponent()
      .setStyles(ComponentStyle.Create().setBackgroundColor(colors.YELLOW))
      .setWidth("50%")
      .setHeight("100%");

    root.addChildren(left).addChildren(right).setDirection("horizontal");

    build(root, cnv);

    cnv.renderBoard();

    expect(left.contentLayout().width).eq(root.contentLayout().width / 2);
    expect(right.contentLayout().width).eq(root.contentLayout().width / 2);

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(colors.MAGENTA);
    expect(cnv.getCell(6, 0)?.styles.backgroundColor()).eq(colors.YELLOW);
  });
  it("components side by side when one doesnt have width", () => {
    const { root, build, cnv } = setupTests(10, 10);

    const left = new DisplayComponent()
      .setStyles(ComponentStyle.Create().setBackgroundColor(colors.MAGENTA))
      .setWidth("50%")
      .setHeight("100%");

    const right = new DisplayComponent()
      .setStyles(ComponentStyle.Create().setBackgroundColor(colors.YELLOW))
      .setHeight("100%");

    root.addChildren(left).addChildren(right).setDirection("horizontal");

    build(root, cnv);

    cnv.renderBoard();

    expect(left.contentLayout().width).eq(root.contentLayout().width / 2);
    expect(right.contentLayout().width).eq(root.contentLayout().width / 2);

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(colors.MAGENTA);
    expect(cnv.getCell(6, 0)?.styles.backgroundColor()).eq(colors.YELLOW);
  });
});

describe("tests the absolute mode", () => {
  it("applies absolute parent padding to normal children", () => {
    const { root, build, cnv } = setupTests(20, 20);

    const child = new DisplayComponent()
      .setWidth("100%")
      .setHeight("100%")
      .setStyles(ComponentStyle.Create().setBackgroundColor(colors.RED));
    const parent = new DisplayComponent()
      .setPositionMode("absolute")
      .setWidth(10)
      .setHeight(10)
      .setIndex(10)
      .setStartX(2)
      .setStartY(2)
      .setPadding({ left: 2, right: 0, top: 0, bottom: 0 })
      .setStyles(ComponentStyle.Create().setBackgroundColor(colors.YELLOW))
      .addChildren(child);

    root.addChildren(parent);
    build(root, cnv);

    expect(child.layout().x).toBe(4);
    expect(child.layout().y).toBe(2);
    expect(cnv.getCell(2, 2)?.styles.backgroundColor()).toBe(colors.YELLOW);
    expect(cnv.getCell(4, 2)?.styles.backgroundColor()).toBe(colors.RED);
  });

  it("can place anywhere ", () => {
    const { root, build, cnv } = setupTests(10, 10);

    const abs = new DisplayComponent()
      .setStyles(ComponentStyle.Create().setBackgroundColor(colors.YELLOW))
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
          ComponentStyle.Create().setBackgroundColor(colors.MAGENTA),
        ),
      )
      .addChildren(abs)
      .setDirection("horizontal");

    const first = root.children().at(1);
    assert(first, "undefined abs");

    build(root, cnv);

    cnv.renderBoard();
    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(colors.MAGENTA);

    expect(cnv.getCell(6, 2)?.styles.backgroundColor()).eq(colors.MAGENTA);
    expect(cnv.getCell(6, 6)?.styles.backgroundColor()).eq(colors.YELLOW);
  });
  it("overlays the absoluted component on inverted order", () => {
    const { root, build, cnv } = setupTests(10, 10);

    root
      .addChildren(
        new DisplayComponent()
          .setStyles(ComponentStyle.Create().setBackgroundColor(colors.YELLOW))
          .setPositionMode("absolute")
          .setHeight(4)
          .setWidth(4)
          .setStartX(6)
          .setStartY(6),
      )

      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.MAGENTA),
        ),
      )
      .setDirection("horizontal");

    build(root, cnv);

    cnv.renderBoard();
    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(colors.MAGENTA);

    expect(cnv.getCell(6, 2)?.styles.backgroundColor()).eq(colors.MAGENTA);
    expect(cnv.getCell(6, 6)?.styles.backgroundColor()).eq(colors.YELLOW);
  });
  it("padding does not change an absolute component's outer position", () => {
    const { build, cnv, root } = setupTests(25, 25);

    const abs = new DisplayComponent()
      .setPositionMode("absolute")
      .setHeight("50%")
      .setWidth("70%")
      .setStartX("20%")
      .setStartY("20%");

    abs.styles().setBackgroundColor(colors.BRIGHT_BLUE);

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

    child.styles().setBackgroundColor(colors.WHITE);
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

  root.styles().setBackgroundColor(colors.MAGENTA);

  const cnv = new TerminalCanvas().setLayout(layout);

  return {
    layout,
    root,
    cnv,
    build: (root: DisplayComponent, canvas: TerminalCanvas) => {
      LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
      LayoutEngine.Arrange(root);

      Renderer.Create(canvas).build(root);
    },
  };
}
