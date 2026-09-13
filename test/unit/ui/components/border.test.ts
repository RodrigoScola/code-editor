import { describe, expect, it } from "vitest";
import { Canvas } from "../../../../src/ui/canvas.js";
import colors from "../../../../src/ui/colors.js";
import { ComponentStyle } from "../../../../src/ui/ComponentStyles.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import { DisplayComponent } from "../../../../src/ui/components/components.js";
import { ComponentBorder } from "../../../../src/ui/components/border.js";
import { EditorRoot } from "../../../../src/Editor/Editor/EditorRoot.js";

describe("tests the component border", () => {
  it("border is in calculation of layout", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 20;

    const border = new ComponentBorder().setParameter(1);
    border.styles().setColor(colors.BLACK_FOREGROUND);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal");

    const left = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
    );

    const right = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.BLUE_BACKGROUND),
    );
    right.border().setLeft(1).setRight(1);
    root.addChildren(left);
    root.addChildren(right);

    const canvas = new Canvas().setLayout(layout);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(layout.width));
    LayoutEngine.Arrange(root);
    Renderer.Create().build(root, canvas);
    expect(canvas.getCell(9, 0)?.styles.backgroundColor()).eq(
      colors.RED_BACKGROUND,
    );

    // expect(canvas.getCell(10, 0)?.styles.backgroundColor()).eq(
    //   colors.BLUE_BACKGROUND,
    // );

    canvas.renderBoard();
  });
  it("displays the border", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const border = new ComponentBorder().setParameter(1);
    border.styles().setColor(colors.BLACK_FOREGROUND);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.BLUE_BACKGROUND),
      )
      .setDirection("vertical")
      .setBorder(border);

    const canvas = new Canvas().setLayout(layout);

    LayoutEngine.Measure(root, LayoutEngine.CreateConstraints(10)).Arrange(
      root,
    );
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });
  it("shows the different styles", () => {
    const layout = LayoutEngine.CreateBounds(10);
    const constraints = LayoutEngine.CreateConstraints(10);

    const cnv = new Canvas().setLayout(layout);

    const root = new EditorRoot().setLayout(layout);

    const heavy = new DisplayComponent();
    heavy.styles().setBackgroundColor(colors.RED_BACKGROUND);

    heavy.border().setParameter(1).setBorderSyle("round");

    root.addChildAt(heavy, 0);

    LayoutEngine.Measure(root, constraints).Arrange(root);
    Renderer.Create().build(root, cnv);

    expect(heavy.contentLayout().height).eq(
      layout.height - heavy.border().vertical(),
    );
    expect(heavy.contentLayout().width).eq(
      layout.width - heavy.border().horizontal(),
    );
    expect(cnv.getCell(0, 0)?.styles.display()).eq(
      heavy.border().borderStyle().top_left,
    );

    expect(cnv.getCell(layout.width - 1, 0)?.styles.display()).eq(
      heavy.border().borderStyle().top_right,
    );

    expect(cnv.getCell(0, layout.height - 1)?.styles.display()).eq(
      heavy.border().borderStyle().bottom_left,
    );

    expect(
      cnv.getCell(layout.width - 1, layout.height - 1)?.styles.display(),
    ).eq(heavy.border().borderStyle().bottom_right);

    expect(
      cnv
        .getCell(Math.floor(layout.width / 2), Math.floor(layout.height - 1))
        ?.styles.display(),
    ).eq(heavy.border().borderStyle().top);

    cnv.renderBoard();
  });
});
