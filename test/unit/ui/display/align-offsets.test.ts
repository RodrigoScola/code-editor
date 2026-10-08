import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// alignment has to be measured from the container's own position, and the
// space taken by gaps sits between items only (n - 1 gaps for n items)

describe("vertical alignment inside a container that is not at y = 0", () => {
  function setup(align: "end" | "center") {
    const { canvas, root } = screen(20, 20);

    const spacer = new DisplayComponent().setHeight(5);
    const container = new DisplayComponent().setHeight(10).setAlignContent(align);
    const child = new DisplayComponent().setHeight(2).setWidth(4);

    container.addChildren(child);
    root.addChildren([spacer, container]);

    layoutAndPaint(root, canvas);

    return { container, child };
  }

  it("end puts the child at the bottom of the container", () => {
    const { container, child } = setup("end");

    expect(container.layout().y).eq(5);
    expect(child.layout().y).eq(13);
  });

  it("center puts the child in the middle of the container", () => {
    const { child } = setup("center");

    expect(child.layout().y).eq(9);
  });
});

describe("gap is part of the space being aligned", () => {
  it("vertical end: the last child touches the bottom", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setHeight(2).setWidth(4);
    const second = new DisplayComponent().setHeight(2).setWidth(4);

    root.setAlignContent("end").setGap(1).addChildren([first, second]);
    layoutAndPaint(root, canvas);

    expect(second.layout().y + second.layout().height).eq(10);
    expect(first.layout().y).eq(5);
  });

  it("vertical center: children and gap are centered together", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setHeight(2).setWidth(4);
    const second = new DisplayComponent().setHeight(2).setWidth(4);

    root.setAlignContent("center").setGap(2).addChildren([first, second]);
    layoutAndPaint(root, canvas);

    // 2 + 2 + 2 = 6 tall, so 2 rows above and 2 below
    expect(first.layout().y).eq(2);
    expect(second.layout().y).eq(6);
  });

  it("horizontal end: no trailing gap after the last child", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setWidth(4).setHeight(2);
    const second = new DisplayComponent().setWidth(4).setHeight(2);

    root
      .setDirection("horizontal")
      .setJustifyContent("end")
      .setGap(2)
      .addChildren([first, second]);
    layoutAndPaint(root, canvas);

    expect(second.layout().x + second.layout().width).eq(20);
    expect(first.layout().x).eq(10);
  });

  it("horizontal center: children and gap are centered together", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setWidth(4).setHeight(2);
    const second = new DisplayComponent().setWidth(4).setHeight(2);

    root
      .setDirection("horizontal")
      .setJustifyContent("center")
      .setGap(2)
      .addChildren([first, second]);
    layoutAndPaint(root, canvas);

    // 4 + 2 + 4 = 10 wide, so 5 columns on each side
    expect(first.layout().x).eq(5);
    expect(second.layout().x).eq(11);
  });
});
