import { assert } from "../../../../src/assert";
import { Canvas, DisplayTile } from "../../../../src/ui/canvas";
import colors from "../../../../src/ui/colors";
import { DisplayComponent } from "../../../../src/ui/components/components";
import { LayoutEngine } from "../../../../src/ui/layout/layout";
import { LayoutBounds } from "../../../../src/ui/layout/layoutStyle";
import { Renderer } from "../../../../src/ui/renderer";
import { TextLayout } from "../../../../src/ui/TextLayout/text";
import { describe, expect, it } from "vitest";

const rowText = (row: DisplayTile[]) => {
  return row
    .map((i) => i.styles.display())
    .join("")
    .trim();
};

const txt = (canvas: Canvas) => {
  return canvas
    .getCells()
    .map((row) =>
      row
        .map((i) => i.styles.display())
        .join("")
        .trim(),
    )
    .join("\n");
};

describe("text clips", () => {
  it("displays correctly", () => {
    const { canvas, root } = setup(LayoutEngine.CreateBounds(10, 1));

    root.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.content().setOverflow("clip");
    build(root, canvas);

    expect(txt(canvas).trimEnd()).eq("thi");
  });

  it("starts and ends correctly", () => {
    const { canvas, root } = setup(LayoutEngine.CreateBounds(10));

    root.content().setOverflow("clip").setLineWidth(3);
    build(root, canvas);

    const line = root.content().lines().at(0)!;
    expect(line.start()).eq(0);

    expect(txt(canvas).trimEnd()).eq("thi");
    expect(line.end()).eq("thi".length);
  });
});

describe("text layout test", () => {
  it("shows the correct text", () => {
    const txt = "this is cool";
    const canvas = new Canvas().setLayout(
      LayoutEngine.CreateBounds(txt.length, 1),
    );
    const root = new DisplayComponent().setText(new TextLayout().setText(txt));

    build(root, canvas);

    expect(rowText(canvas.getRow(0)!)).eq(txt);
    expect(root.content().lines().at(-1)?.end()).eq(txt.length);
  });

  it("clips when max width", () => {
    const str = "this is cool";
    const canvas = new Canvas().setLayout(
      LayoutEngine.CreateBounds(str.length, 1),
    );
    const root = new TextLayout()
      .setLineWidth(3)
      .setOverflow("clip")
      .setText(str);

    const dp = new DisplayComponent().setText(root);

    build(dp, canvas);

    const size = root.layout();
    expect(size.width).eq(3);
    expect(size.height).eq(1);

    expect(txt(canvas).trimEnd()).eq("thi");
  });
  it("overflows the container when not clip or wrap", () => {
    const str = "this is cool";
    const canvas = new Canvas().setLayout(
      LayoutEngine.CreateBounds(str.length, 1),
    );
    const root = new TextLayout()
      .setLineWidth(3)
      .setOverflow("visible")
      .setText(str);

    const dp = new DisplayComponent().setText(root);
    dp.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    build(dp, canvas);
    const size = root.layout();
    expect(size.width).eq(str.length);
    expect(size.height).eq(1);
    expect(txt(canvas).trimEnd()).eq(str);
  });

  it("wraps around correctly", () => {
    const { root, canvas } = setup(LayoutEngine.CreateBounds(10, 4));

    root.content().setOverflow("wrap");

    build(root, canvas);

    expect(txt(canvas)).eq("thi\ns i\ns c\nool");
  });
});

describe("line wrap", () => {
  it("visually wraps the lines", () => {
    const { canvas, root } = setup(LayoutEngine.CreateBounds(10, 4));

    root.content().setOverflow("wrap");
    build(root, canvas);

    expect(txt(canvas)).eq("thi\ns i\ns c\nool");
  });

  it("height and width correct", () => {
    const { root, canvas } = setup(LayoutEngine.CreateBounds(10, 4));

    root.content().setOverflow("wrap");

    build(root, canvas);

    const size = root.content().layout();
    expect(size.width).eq(3);
    expect(size.height).eq(4);
    expect(txt(canvas)).eq("thi\ns i\ns c\nool");
  });

  it("starts and end wrap too", () => {
    const { root, canvas } = setup(LayoutEngine.CreateBounds(10, 4));

    root.content().setOverflow("wrap");

    build(root, canvas);
    const lines = root.content().lines();

    expect(lines.at(0)?.end()).eq(3);
    expect(lines.at(1)?.end()).eq(6);
    expect(lines.at(2)?.end()).eq(9);
    expect(lines.at(3)?.end()).eq(12);
  });
});
describe("text align right", () => {
  it("aligns to the right", () => {
    const layout = LayoutEngine.CreateBounds(15, 4);
    const { root, canvas } = setup(layout);

    root.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.setMaxWidth(layout.width);
    root.content().setLineWidth(layout.width);
    root.content().setText("aa").setAlign("right");

    build(root, canvas);

    expect(root.content().lines().at(0)?.x()).eq(
      layout.width - root.content().lines().at(0)!.content().length,
    );
  });
  it("justifies", () => {
    const layout = LayoutEngine.CreateBounds(15, 4);
    const { root, canvas } = setup(layout);

    root.setMaxWidth(layout.width);
    root
      .content()
      .setText("aa\nb bb bb\ncc cc")
      .setAlign("right")
      .setJustify(true);

    root.content().setOverflow("wrap");
    root.content().setLineWidth(layout.width);

    build(root, canvas);

    for (const line of root.content().lines())
      expect(line.x()).eq(layout.width - line!.content().length);
  });
  it("supports multiline", () => {
    const layout = LayoutEngine.CreateBounds(15, 4);
    const { root, canvas } = setup(layout);

    root.content().setLineWidth(layout.width);
    root.content().setText("aa\nbbbb\nccccccc").setAlign("right");

    root.content().setOverflow("wrap");

    build(root, canvas);

    for (const line of root.content().lines())
      expect(line.x()).eq(layout.width - line!.content().length);
  });
});

describe("text align center", () => {
  it("centers the text", () => {
    const layout = LayoutEngine.CreateBounds(15, 4);
    const { root, canvas } = setup(layout);

    root.setMaxWidth(layout.width);
    root.content().setText("aa").setAlign("center");

    root.content().setOverflow("wrap");
    root.setLineWidth(layout.width);

    build(root, canvas);

    expect(root.content().lines().at(0)?.x()).eq(6);
  });
  it("centers and wraps around", () => {
    const layout = LayoutEngine.CreateBounds(20, 4);
    const { root, canvas } = setup(layout);

    root.setMaxWidth(layout.width);
    root.content().setText("aaabcd\neftg").setAlign("center");
    root.setLineWidth(layout.width);

    root.content().setOverflow("wrap");

    build(root, canvas);

    expect(root.content().lines().at(1)?.x()).eq(8);
  });
  it("justifies on the center", () => {
    const layout = LayoutEngine.CreateBounds(30, 4);
    const { root, canvas } = setup(layout);

    root.setLineWidth(layout.width);

    root.setMaxWidth(layout.width);
    root
      .content()
      .setText("aa abcd k\ne ftg")
      .setAlign("center")
      .setJustify(true);

    root.content().setOverflow("wrap");

    build(root, canvas);

    expect(root.content().lines().at(1)?.x()).eq(11);
    expect(root.content().lines().at(1)?.width()).eq(8);
  });
});

describe("display component integration", () => {
  it("shows text", () => {
    const layout = LayoutEngine.CreateBounds(10, 3);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent().setLayout(layout);
    root.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    root.setContent("this is great");

    display(root, canvas);

    expect(txt(canvas).trim()).eq("this is gr\neat");
  });
  it("respects max height", () => {
    const layout = LayoutEngine.CreateBounds(10, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent().setLayout(layout);
    const parent = new DisplayComponent();
    root.styles().setBackgroundColor(colors.RED_BACKGROUND);
    parent.styles().setBackgroundColor(colors.BLUE_BACKGROUND);

    parent.setContent("thisis\ngreat\nmi\nright");

    parent.setMaxHeight(3);

    root.addChildren(parent);

    display(root, canvas);

    expect(txt(canvas).trim()).eq("thisis\ngreat\nmi");
  });
  it("respects max width ", () => {
    const layout = LayoutEngine.CreateBounds(20, 10);
    const canvas = new Canvas().setLayout(layout);

    const root = new DisplayComponent().setLayout(layout);
    const parent = new DisplayComponent();
    root.styles().setBackgroundColor(colors.RED_BACKGROUND);
    parent.styles().setBackgroundColor(colors.BLUE_BACKGROUND);
    parent.setTextOverflow("clip");
    parent.setMaxWidth(10);

    parent.setContent("this is great substance");

    parent.setMaxHeight(3);

    root.addChildren(parent);

    display(root, canvas);

    expect(txt(canvas).trim()).eq("this is gr");
  });
});


function display(root: DisplayComponent, canvas: Canvas) {
  LayoutEngine.Measure(
    root,
    LayoutEngine.CreateConstraints(canvas.layout().width),
  );
  LayoutEngine.Arrange(root);

  Renderer.Create().build(root, canvas);
  canvas.renderBoard();
}

function setup(layout: LayoutBounds) {
  const str = "this is cool";
  const canvas = new Canvas().setLayout(layout);

  const root = new DisplayComponent()
    .setText(new TextLayout().setLineWidth(3).setText(str))
    .setLayout(layout);

  return {
    str,
    canvas,
    root,
  };
}

function build(root: DisplayComponent, canvas: Canvas) {
  LayoutEngine.Measure(
    root,
    LayoutEngine.CreateConstraints(canvas.layout().width),
  );
  LayoutEngine.Arrange(root);
  Renderer.Create().build(root, canvas);

  canvas.renderBoard();
}
