import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { TextBuffer } from "../../../../src/ui/buffer/Buffer.js";

describe("buffer edits invalidate layout", () => {
  function setup() {
    const leaf = new DisplayComponent().setWidth(20).setHeight(10);
    const root = new DisplayComponent()
      .setWidth(20)
      .setHeight(10)
      .addChildren(
        new DisplayComponent().setWidth(20).setHeight(10).addChildren(leaf),
      );
    const buffer = new TextBuffer("a\nb\nc");
    leaf.content().setBuffer(buffer);

    const frame = () => {
      LayoutEngine.Measure(root, LayoutEngine.Unconstrained());
      LayoutEngine.Arrange(root);
      return leaf.content().lines().map((line) => line.content());
    };

    frame();
    return { buffer, frame };
  }

  it("removes the line from a nested component's visual lines", () => {
    const { buffer, frame } = setup();

    buffer.removeLine(1);

    expect(frame()).toEqual(["a", "c"]);
  });

  it("shows inserted characters in a nested component", () => {
    const { buffer, frame } = setup();

    buffer.addCharacter(0, 1, "X");

    expect(frame()).toEqual(["aX", "b", "c"]);
  });
});

describe("default buffer edits invalidate layout", () => {
  it("shows edits made to a component's default buffer", () => {
    const leaf = new DisplayComponent().setWidth(80).setHeight(1);
    const root = new DisplayComponent()
      .setWidth(80)
      .setHeight(1)
      .addChildren(
        new DisplayComponent().setWidth(80).setHeight(1).addChildren(leaf),
      );
    const frame = () => {
      LayoutEngine.Measure(root, LayoutEngine.Unconstrained());
      LayoutEngine.Arrange(root);
      return leaf.content().lines().map((line) => line.content());
    };

    leaf.content().buffer().addLine("this is the content");
    frame();

    leaf.content().buffer().addCharacter(0, 1, "X");

    expect(frame()).toEqual(["tXhis is the content"]);
  });
});
