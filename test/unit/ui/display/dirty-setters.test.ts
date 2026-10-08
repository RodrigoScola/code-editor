import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// Layout is cached: measure() returns the old size and arrangeContent() bails
// out unless the component is dirty. Any setter that changes layout therefore
// has to mark the component dirty, or changing it after the first frame does
// nothing. Each case lays out once, changes one property, lays out again.

describe("setters that change layout mark the component dirty", () => {
  it("setJustifyContent", () => {
    const { canvas, root } = screen(20, 10);
    const child = new DisplayComponent().setWidth(4).setHeight(2);
    root.setDirection("horizontal").addChildren(child);

    layoutAndPaint(root, canvas);
    expect(child.layout().x).eq(0);

    root.setJustifyContent("end");
    layoutAndPaint(root, canvas);

    expect(child.layout().x).eq(16);
  });

  it("setAlignContent", () => {
    const { canvas, root } = screen(20, 10);
    const child = new DisplayComponent().setWidth(4).setHeight(2);
    root.addChildren(child);

    layoutAndPaint(root, canvas);
    expect(child.layout().y).eq(0);

    root.setAlignContent("end");
    layoutAndPaint(root, canvas);

    expect(child.layout().y).eq(8);
  });

  it("setGap", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setWidth(4).setHeight(2);
    const second = new DisplayComponent().setWidth(4).setHeight(2);
    root.setDirection("horizontal").addChildren([first, second]);

    layoutAndPaint(root, canvas);
    expect(second.layout().x).eq(4);

    root.setGap(2);
    layoutAndPaint(root, canvas);

    expect(second.layout().x).eq(6);
  });

  it("setWrap", () => {
    const { canvas, root } = screen(10, 10);
    const children = [0, 1, 2].map(() =>
      new DisplayComponent().setWidth(4).setHeight(2),
    );
    root.setDirection("horizontal").addChildren(children);

    layoutAndPaint(root, canvas);
    expect(children[2].layout().x).eq(8);

    root.setWrap("wrap");
    layoutAndPaint(root, canvas);

    expect(children[2].layout().x).eq(0);
    expect(children[2].layout().y).greaterThan(0);
  });

  it("setDisplay", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setWidth(4).setHeight(2);
    const second = new DisplayComponent().setWidth(4).setHeight(2);
    root.setDirection("horizontal").addChildren([first, second]);

    layoutAndPaint(root, canvas);
    expect(second.layout().x).eq(4);

    first.setDisplay("none");
    layoutAndPaint(root, canvas);

    expect(second.layout().x).eq(0);
  });

  it("setMarginLeft", () => {
    const { canvas, root } = screen(20, 10);
    const child = new DisplayComponent().setWidth(4).setHeight(2);
    root.setDirection("horizontal").addChildren(child);

    layoutAndPaint(root, canvas);
    expect(child.layout().x).eq(0);

    child.setMarginLeft(3);
    layoutAndPaint(root, canvas);

    expect(child.layout().x).eq(3);
  });

  it("setMarginRight", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setWidth(4).setHeight(2);
    const second = new DisplayComponent().setWidth(4).setHeight(2);
    root.setDirection("horizontal").addChildren([first, second]);

    layoutAndPaint(root, canvas);
    expect(second.layout().x).eq(4);

    first.setMarginRight(3);
    layoutAndPaint(root, canvas);

    expect(second.layout().x).eq(7);
  });

  it("setMarginTop", () => {
    const { canvas, root } = screen(20, 10);
    const child = new DisplayComponent().setWidth(4).setHeight(2);
    root.addChildren(child);

    layoutAndPaint(root, canvas);
    expect(child.layout().y).eq(0);

    child.setMarginTop(2);
    layoutAndPaint(root, canvas);

    expect(child.layout().y).eq(2);
  });

  it("setMarginBottom", () => {
    const { canvas, root } = screen(20, 10);
    const first = new DisplayComponent().setWidth(4).setHeight(2);
    const second = new DisplayComponent().setWidth(4).setHeight(2);
    root.addChildren([first, second]);

    layoutAndPaint(root, canvas);
    expect(second.layout().y).eq(2);

    first.setMarginBottom(3);
    layoutAndPaint(root, canvas);

    expect(second.layout().y).eq(5);
  });

  // text setters: the text has to live on a child, because the component
  // being arranged always re-measures its own text, but a clean parent never
  // arranges its children again

  it("setTextAlign", () => {
    const { canvas, root } = screen(10, 3);
    const label = new DisplayComponent().setHeight(1).setContent("ab");
    root.addChildren(label);

    layoutAndPaint(root, canvas);
    expect(label.content().lines()[0].x()).eq(0);

    label.setTextAlign("right");
    layoutAndPaint(root, canvas);

    expect(label.content().lines()[0].x()).eq(8);
  });

  it("setTextOverflow", () => {
    const { canvas, root } = screen(10, 3);
    const label = new DisplayComponent().setContent("a".repeat(20));
    root.addChildren(label);

    layoutAndPaint(root, canvas);
    expect(label.content().lines()).length(2);

    label.setTextOverflow("clip");
    layoutAndPaint(root, canvas);

    expect(label.content().lines()).length(1);
  });

  it("setLineWidth", () => {
    const { canvas, root } = screen(10, 3);
    const label = new DisplayComponent().setContent("abcdefghij");
    root.addChildren(label);

    layoutAndPaint(root, canvas);
    expect(label.content().lines()).length(1);

    label.setLineWidth(5);
    layoutAndPaint(root, canvas);

    expect(label.content().lines()).length(2);
  });
});
