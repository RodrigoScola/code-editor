import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { backgrounds, box, chars, paint, screen } from "./helpers.js";

// Level 5: two properties that change what's painted without new math.
//
//   setTextTransform("uppercase" | "lowercase" | "capitalize" | "none")
//     CSS text-transform: changes how the text is painted, not the text.
//     content() keeps what was set. Inherited by children, like CSS.
//
//   setVisibility("visible" | "hidden")
//     CSS visibility: a hidden component keeps its space but isn't painted
//     (its cells show what's behind it). Its children are hidden too, unless
//     a child sets "visible" again. Not the same as setVisible(false), which
//     is display: none and gives the space up.

describe("text-transform", () => {
  function text(content: string, transform: string) {
    const { canvas, root } = screen(12, 1);
    root.setContent(content);
    (root as any).setTextTransform(transform);
    return chars(paint(root, canvas)).trimEnd();
  }

  it("uppercase", () => {
    expect(text("hello", "uppercase")).eq("HELLO");
  });

  it("lowercase", () => {
    expect(text("HeLLo", "lowercase")).eq("hello");
  });

  it("capitalize: the first letter of each word", () => {
    expect(text("hello big world", "capitalize")).eq("Hello Big World");
  });

  it("capitalize leaves the rest of a word alone", () => {
    expect(text("mcDonald", "capitalize")).eq("McDonald");
  });

  it("none paints the text as it is", () => {
    expect(text("HeLLo", "none")).eq("HeLLo");
  });

  it("is none by default", () => {
    expect((new DisplayComponent() as any).textTransform()).eq("none");
  });

  it("textTransform() reads it back", () => {
    const component = new DisplayComponent() as any;
    component.setTextTransform("uppercase");
    expect(component.textTransform()).eq("uppercase");
  });

  it("doesn't change content()", () => {
    const component = new DisplayComponent().setContent("hello") as any;
    component.setTextTransform("uppercase");
    expect(component.content().toString()).toContain("hello");
  });

  it("children inherit it", () => {
    const { canvas, root } = screen(6, 1);
    (root as any).setTextTransform("uppercase");
    root.addChildren(box(5, 1, "child"));

    expect(chars(paint(root, canvas)).trimEnd()).eq("CHILD");
  });

  it("a child can turn it off", () => {
    const { canvas, root } = screen(6, 1);
    (root as any).setTextTransform("uppercase");
    const child = box(5, 1, "child") as any;
    child.setTextTransform("none");
    root.addChildren(child);

    expect(chars(paint(root, canvas)).trimEnd()).eq("child");
  });

  it("changing it repaints (it marks the component dirty)", () => {
    const component = new DisplayComponent() as any;
    component.setDirty(false);
    component.setTextTransform("uppercase");
    expect(component.dirty()).eq(true);
  });
});

describe("visibility", () => {
  // [a][b][c] side by side, 2 cells each, b in the middle
  function row(setup: (b: any) => void) {
    const { canvas, root } = screen(6, 1);
    root.setDirection("horizontal").setBackgroundColor("#000000");
    const a = box(2, 1, "aa");
    const b = box(2, 1, "bb").setBackgroundColor("#ffffff") as any;
    const c = box(2, 1, "cc");
    root.addChildren([a, b, c]);
    setup(b);
    return paint(root, canvas);
  }

  it("is visible by default", () => {
    expect((new DisplayComponent() as any).visibility()).eq("visible");
  });

  it("hidden isn't painted: no text, no background", () => {
    const cells = row((b) => b.setVisibility("hidden"));

    expect(chars(cells)).eq("aa  cc");
    expect(backgrounds(cells).slice(2, 4)).toEqual(["#000000", "#000000"]);
  });

  it("hidden keeps its space: the next one doesn't move", () => {
    const cells = row((b) => b.setVisibility("hidden"));
    expect(chars(cells).slice(4)).eq("cc");
  });

  it("setVisible(false) gives the space up, for comparison", () => {
    const cells = row((b) => b.setVisible(false));
    expect(chars(cells).slice(2, 4)).eq("cc");
  });

  it("visible again paints again", () => {
    const cells = row((b) => b.setVisibility("hidden").setVisibility("visible"));
    expect(chars(cells)).eq("aabbcc");
  });

  it("hides the children too", () => {
    const { canvas, root } = screen(4, 1);
    const parent = box(4, 1) as any;
    parent.addChildren(box(4, 1, "kid"));
    parent.setVisibility("hidden");
    root.addChildren(parent);

    expect(chars(paint(root, canvas))).eq("    ");
  });

  it("a child that sets visible is painted inside a hidden parent", () => {
    const { canvas, root } = screen(4, 1);
    const parent = box(4, 1) as any;
    const kid = box(3, 1, "kid") as any;
    kid.setVisibility("visible");
    parent.addChildren(kid);
    parent.setVisibility("hidden");
    root.addChildren(parent);

    expect(chars(paint(root, canvas))).eq("kid ");
  });

  it("changing it repaints (it marks the component dirty)", () => {
    const component = new DisplayComponent() as any;
    component.setDirty(false);
    component.setVisibility("hidden");
    expect(component.dirty()).eq(true);
  });
});
