import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// Proposed API:
//   container.setAlignItems("start" | "center" | "end" | "stretch")
//   child.setAlignSelf("auto" | "start" | "center" | "end" | "stretch")
//
// These place each child on the cross axis (CSS semantics): y in a
// horizontal container, x in a vertical one. alignSelf overrides the
// container's alignItems for one child; "auto" (default) uses it.
// "stretch" (default) only stretches children without an explicit size,
// which is what happens today.

function row(alignItems: string, children: DisplayComponent[]) {
  const { canvas, root } = screen(20, 10);
  root
    .setDirection("horizontal")
    
    .setAlignItems(alignItems)
    .addChildren(children);
  layoutAndPaint(root, canvas);
}

function column(alignItems: string, children: DisplayComponent[]) {
  const { canvas, root } = screen(20, 10);
  root.setAlignItems(alignItems).addChildren(children);
  layoutAndPaint(root, canvas);
}

const box = (width: number, height: number) =>
  new DisplayComponent().setWidth(width).setHeight(height);

describe("alignItems in a horizontal container", () => {
  it("start puts children at the top", () => {
    const child = box(4, 2);
    row("start", [child]);

    expect(child.layout().y).eq(0);
  });

  it("center centers children vertically", () => {
    const child = box(4, 2);
    row("center", [child]);

    expect(child.layout().y).eq(4);
  });

  it("end puts children at the bottom", () => {
    const child = box(4, 2);
    row("end", [child]);

    expect(child.layout().y).eq(8);
  });

  it("aligns each child by its own height", () => {
    const short = box(4, 2);
    const tall = box(4, 6);
    row("center", [short, tall]);

    expect(short.layout().y).eq(4);
    expect(tall.layout().y).eq(2);
  });

  it("stretch fills the height when the child has none", () => {
    const child = new DisplayComponent().setWidth(4);
    row("stretch", [child]);

    expect(child.layout().y).eq(0);
    expect(child.layout().height).eq(10);
  });

  it("does not change the main axis", () => {
    const first = box(4, 2);
    const second = box(4, 2);
    row("center", [first, second]);

    expect(first.layout().x).eq(0);
    expect(second.layout().x).eq(4);
  });
});

describe("alignItems in a vertical container", () => {
  it("center centers each child horizontally by its own width", () => {
    const narrow = box(4, 2);
    const wide = box(10, 2);
    column("center", [narrow, wide]);

    expect(narrow.layout().x).eq(8);
    expect(wide.layout().x).eq(5);
  });

  it("end puts children at the right", () => {
    const child = box(4, 2);
    column("end", [child]);

    expect(child.layout().x).eq(16);
  });

  it("stretch fills the width when the child has none", () => {
    const child = new DisplayComponent().setHeight(2);
    column("stretch", [child]);

    expect(child.layout().width).eq(20);
  });
});

describe("alignSelf", () => {
  it("overrides the container for one child", () => {
    const first = box(4, 2);
    const second = box(4, 2).setAlignSelf("end");
    row("center", [first, second]);

    expect(first.layout().y).eq(4);
    expect(second.layout().y).eq(8);
  });

  it("auto uses the container's alignItems", () => {
    const child = box(4, 2).setAlignSelf("auto");
    row("end", [child]);

    expect(child.layout().y).eq(8);
  });
});
