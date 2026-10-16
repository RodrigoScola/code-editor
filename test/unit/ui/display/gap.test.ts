import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// gap: the space between children, like CSS gap. There is one between each
// pair of children, so n children have n - 1 gaps, none before the first or
// after the last. Measure, layout, justify and wrapping all have to agree
// on that. (scroll-size.test.ts checks scrollHeight / scrollWidth.)

function block(width: number, height: number) {
  return new DisplayComponent().setWidth(width).setHeight(height);
}

function container() {
  const { canvas, root } = screen(30, 20);
  const box = new DisplayComponent();
  root.addChildren(box);
  return { canvas, root, box };
}

describe("placing children", () => {
  it("leaves the gap between children in a column", () => {
    const { canvas, root, box } = container();
    const kids = [block(2, 3), block(2, 3), block(2, 3)];
    box.setGap(2).addChildren(kids);

    layoutAndPaint(root, canvas);

    expect(kids.map((k) => k.layout().y)).toEqual([0, 5, 10]);
  });

  it("leaves the gap between children in a row", () => {
    const { canvas, root, box } = container();
    const kids = [block(3, 1), block(3, 1), block(3, 1)];
    box.setDirection("horizontal").setGap(1).addChildren(kids);

    layoutAndPaint(root, canvas);

    expect(kids.map((k) => k.layout().x)).toEqual([0, 4, 8]);
  });

  it("does not leave a gap for a hidden child", () => {
    const { canvas, root, box } = container();
    const kids = [block(2, 3), block(2, 3).setVisible(false), block(2, 3)];
    box.setGap(2).addChildren(kids);

    layoutAndPaint(root, canvas);

    expect(kids[2].layout().y).eq(5);
  });
});

describe("auto size", () => {
  it("counts the gaps in an auto height", () => {
    const { canvas, root, box } = container();
    box.setGap(2).addChildren([block(2, 3), block(2, 3), block(2, 3)]);

    layoutAndPaint(root, canvas);

    // 3 * 3 + 2 gaps of 2
    expect(box.measuredSize().height).eq(13);
  });

  it("counts the gaps in an auto width", () => {
    const { canvas, root, box } = container();
    box
      .setDirection("horizontal")
      .setGap(2)
      .addChildren([block(2, 1), block(2, 1), block(2, 1)]);

    layoutAndPaint(root, canvas);

    expect(box.measuredSize().width).eq(10);
  });

  it("has no gap with a single child", () => {
    const { canvas, root, box } = container();
    box.setGap(5).addChildren(block(2, 3));

    layoutAndPaint(root, canvas);

    expect(box.measuredSize().height).eq(3);
  });

  it("fits the auto size to where the last child ends", () => {
    const { canvas, root, box } = container();
    const kids = [block(2, 3), block(2, 1), block(2, 2)];
    box.setGap(1).addChildren(kids);

    layoutAndPaint(root, canvas);

    const last = kids[2];
    expect(box.measuredSize().height).eq(
      last.layout().y + last.layout().height - box.layout().y,
    );
  });
});

describe("justify content", () => {
  // 30 wide row, two 6 wide children with a gap of 2: a group of 14
  function row(justify: "center" | "end") {
    const { canvas, root } = screen(30, 20);
    const box = new DisplayComponent()
      .setWidth(30)
      .setHeight(3)
      .setDirection("horizontal")
      .setJustifyContent(justify)
      .setGap(2);
    const kids = [block(6, 1), block(6, 1)];
    box.addChildren(kids);
    root.addChildren(box);
    layoutAndPaint(root, canvas);
    return kids;
  }

  it("centers the children with the gap between them, not after", () => {
    const kids = row("center");

    expect(kids[0].layout().x).eq((30 - 14) / 2);
    expect(kids[1].layout().x).eq((30 - 14) / 2 + 8);
  });

  it("ends the last child on the right edge", () => {
    const kids = row("end");

    expect(kids[1].layout().x + kids[1].layout().width).eq(30);
  });
});

describe("wrapping", () => {
  it("does not wrap a column that fits exactly", () => {
    const { canvas, root } = screen(30, 20);
    const kids = [block(2, 3), block(2, 3), block(2, 3)];
    // 3 + 1 + 3 + 1 + 3 = 11
    const box = new DisplayComponent()
      .setWidth(10)
      .setHeight(11)
      .setWrap("wrap")
      .setGap(1)
      .addChildren(kids);
    root.addChildren(box);

    layoutAndPaint(root, canvas);

    expect(kids.map((k) => k.layout().x)).toEqual([0, 0, 0]);
    expect(kids[2].layout().y).eq(8);
  });

  it("wraps the child that doesn't fit with its gap", () => {
    const { canvas, root } = screen(30, 20);
    const kids = [block(2, 3), block(2, 3), block(2, 3)];
    // the third would end at 11, one past the 10 rows
    const box = new DisplayComponent()
      .setWidth(10)
      .setHeight(10)
      .setWrap("wrap")
      .setGap(1)
      .addChildren(kids);
    root.addChildren(box);

    layoutAndPaint(root, canvas);

    expect(kids[2].layout().y).eq(0);
    expect(kids[2].layout().x).toBeGreaterThan(0);
  });
});
