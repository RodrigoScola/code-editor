import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../components.js";
import { LayoutEngine } from "./layout.js";
import { Renderer } from "../renderer.js";
import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { assert } from "../../assert.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { builtinModules } from "node:module";

describe("tests normal position mode", () => {
  it("components side by side", () => {
    const { root, build, cnv } = setupTests(10, 10);

    root
      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
        ),
      )
      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.YELLOW_BACKGROUND),
        ),
      )
      .setDirection("horizontal");

    build(root, cnv);

    expect(cnv.getCell(0, 0)?.styles.backgroundColor()).eq(
      colors.MAGENTA_BACKGROUND,
    );
    expect(cnv.getCell(6, 0)?.styles.backgroundColor()).eq(
      colors.YELLOW_BACKGROUND,
    );
  });
});

describe("tests the absolute mode", () => {
  it("can place anywhere ", () => {
    const { root, build, cnv } = setupTests(10, 10);

    root
      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
        ),
      )
      .addChildren(
        new DisplayComponent()
          .setStyles(
            ComponentStyle.Create().setBackgroundColor(
              colors.YELLOW_BACKGROUND,
            ),
          )
          .setName("absolute")
          .setPositionMode("absolute")
          .setLayout({
            width: 4,
            height: 4,
            x: 6,
            y: 6,
          }),
      )
      .setDirection("horizontal");

    expect(root.children().at(1)?.contentLayout().height).eq(4);
    expect(root.children().at(1)?.contentLayout().width).eq(4);

    build(root, cnv);

    cnv.renderBoard();
    testCnv(cnv);
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
          .setLayout({
            width: 4,
            height: 4,
            x: 6,
            y: 6,
          }),
      )

      .addChildren(
        new DisplayComponent().setStyles(
          ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
        ),
      )
      .setDirection("horizontal");

    build(root, cnv);

    cnv.renderBoard();
    testCnv(cnv);
  });
});
function testCnv(canvas: Canvas) {
  expect(canvas.getCell(0, 0)?.styles.backgroundColor()).eq(
    colors.MAGENTA_BACKGROUND,
  );

  expect(canvas.getCell(6, 2)?.styles.backgroundColor()).eq(
    colors.MAGENTA_BACKGROUND,
  );
  expect(canvas.getCell(6, 6)?.styles.backgroundColor()).eq(
    colors.YELLOW_BACKGROUND,
  );
}

function setupTests(height: number = 10, width: number = 10) {
  const layout = LayoutEngine.CreateBounds();
  layout.height = height;
  layout.width = width;

  const root = new DisplayComponent().setLayout(layout);

  const cnv = new Canvas().setLayout(layout);

  return {
    layout,
    root,
    cnv,
    build: (root: Component, canvas: Canvas) => {
      LayoutEngine.Measure(root, root.contentLayout());

      Renderer.Create().build(root, canvas);
    },
  };
}
