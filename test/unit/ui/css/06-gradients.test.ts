import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { backgrounds, box, chars, paint, screen } from "./helpers.js";

// Level 6: gradient backgrounds on components.
//
//   component.setBackgroundImage("linear-gradient(to right, #000, #fff)")
//   component.backgroundImage()      the string, "none" by default
//
// Each cell's background is the gradient sampled at that cell
// (sampleGradient, level 4) over the component's whole box. The terminal gets
// one 24-bit color per cell (ESC[48;2;r;g;bm), so this works in any terminal
// with true color, and the window renderer draws the same cells.
//
// Like CSS, the image is painted over background-color, it isn't inherited,
// and a child with no background of its own shows its parent's gradient
// where it sits (the gradient continues under it, it doesn't restart).
//
// Needs hex colors in the terminal renderer: test/unit/ui/styles/truecolor.

const BLACK_TO_WHITE = "linear-gradient(to right, #000000, #ffffff)";

function gradientRow(width: number, image: string, setup?: (root: any) => void) {
  const { canvas, root } = screen(width, 1);
  (root as any).setBackgroundImage(image);
  setup?.(root);
  return paint(root, canvas);
}

describe("backgroundImage()", () => {
  it('is "none" by default', () => {
    expect((new DisplayComponent() as any).backgroundImage()).eq("none");
  });

  it("is the string that was set", () => {
    const component = new DisplayComponent() as any;
    component.setBackgroundImage(BLACK_TO_WHITE);
    expect(component.backgroundImage()).eq(BLACK_TO_WHITE);
  });

  it("throws for something that isn't a gradient, naming it", () => {
    const component = new DisplayComponent() as any;
    expect(() => component.setBackgroundImage("linear-gradient(red)")).toThrow(
      /linear-gradient\(red\)/,
    );
  });

  it("setting it repaints (marks the component dirty)", () => {
    const component = new DisplayComponent() as any;
    component.setDirty(false);
    component.setBackgroundImage(BLACK_TO_WHITE);
    expect(component.dirty()).eq(true);
  });
});

describe("painting a linear gradient", () => {
  it("to right: one color per column", () => {
    expect(backgrounds(gradientRow(4, BLACK_TO_WHITE))).toEqual([
      "#202020",
      "#606060",
      "#9f9f9f",
      "#dfdfdf",
    ]);
  });

  it("to bottom: one color per row", () => {
    const { canvas, root } = screen(2, 2);
    (root as any).setBackgroundImage("linear-gradient(#000000, #ffffff)");
    const cells = paint(root, canvas);

    expect(backgrounds(cells, 0)).toEqual(["#404040", "#404040"]);
    expect(backgrounds(cells, 1)).toEqual(["#bfbfbf", "#bfbfbf"]);
  });

  it("three stops", () => {
    expect(
      backgrounds(gradientRow(4, "linear-gradient(to right, red, lime, blue)")),
    ).toEqual(["#bf4000", "#40bf00", "#00bf40", "#0040bf"]);
  });

  it("named and rgb() colors", () => {
    expect(
      backgrounds(gradientRow(2, "linear-gradient(to right, black, rgb(255, 255, 255))")),
    ).toEqual(["#404040", "#bfbfbf"]);
  });

  it("covers the whole box, padding included", () => {
    const cells = gradientRow(4, BLACK_TO_WHITE, (root) =>
      root.setPaddingLeft(1).setPaddingRight(1),
    );
    expect(backgrounds(cells)[0]).eq("#202020");
    expect(backgrounds(cells)[3]).eq("#dfdfdf");
  });

  it("follows the component's size when it changes", () => {
    const { canvas, root } = screen(8, 1);
    const bar = box(4, 1) as any;
    bar.setBackgroundImage(BLACK_TO_WHITE);
    root.addChildren(bar);
    paint(root, canvas);

    bar.setWidth(8);
    expect(backgrounds(paint(root, canvas))[0]).eq("#101010");
  });

  it("a gradient on a child spans the child, starting where it starts", () => {
    const { canvas, root } = screen(6, 1);
    root.setDirection("horizontal");
    const bar = box(2, 1) as any;
    bar.setBackgroundImage(BLACK_TO_WHITE);
    root.addChildren([box(4, 1), bar]);

    expect(backgrounds(paint(root, canvas)).slice(4)).toEqual([
      "#404040",
      "#bfbfbf",
    ]);
  });
});

describe("text on a gradient", () => {
  it("the text is painted on top", () => {
    const cells = gradientRow(4, BLACK_TO_WHITE, (root) => root.setContent("hi"));
    expect(chars(cells)).eq("hi  ");
  });

  it("the characters keep the gradient under them", () => {
    const cells = gradientRow(4, BLACK_TO_WHITE, (root) => root.setContent("hi"));
    expect(backgrounds(cells)[0]).eq("#202020");
    expect(backgrounds(cells)[1]).eq("#606060");
  });

  it("the text keeps its own color", () => {
    const cells = gradientRow(4, BLACK_TO_WHITE, (root) =>
      root.setContent("hi").setColor("#ff0000"),
    );
    expect(cells[0][0].color).eq("#ff0000");
  });
});

describe("children and the gradient", () => {
  it("a child without a background shows the parent's gradient where it sits", () => {
    const { canvas, root } = screen(4, 1);
    root.setDirection("horizontal");
    (root as any).setBackgroundImage(BLACK_TO_WHITE);
    root.addChildren([box(2, 1, "ab"), box(2, 1, "cd")]);

    expect(backgrounds(paint(root, canvas))).toEqual([
      "#202020",
      "#606060",
      "#9f9f9f",
      "#dfdfdf",
    ]);
  });

  it("a child with a background color covers it", () => {
    const { canvas, root } = screen(4, 1);
    root.setDirection("horizontal");
    (root as any).setBackgroundImage(BLACK_TO_WHITE);
    root.addChildren([box(2, 1), box(2, 1).setBackgroundColor("#ff0000")]);

    expect(backgrounds(paint(root, canvas)).slice(2)).toEqual([
      "#ff0000",
      "#ff0000",
    ]);
  });

  it("it isn't inherited: a child's own gradient isn't the parent's", () => {
    const { canvas, root } = screen(4, 1);
    root.setDirection("horizontal");
    (root as any).setBackgroundImage(BLACK_TO_WHITE);
    const child = box(2, 1) as any;
    child.setBackgroundImage("linear-gradient(to right, #ff0000, #ff0000)");
    root.addChildren([box(2, 1), child]);

    expect(backgrounds(paint(root, canvas))).toEqual([
      "#202020",
      "#606060",
      "#ff0000",
      "#ff0000",
    ]);
  });
});

describe("background-color and background-image together", () => {
  it("an opaque gradient covers the color", () => {
    const cells = gradientRow(2, BLACK_TO_WHITE, (root) =>
      root.setBackgroundColor("#ff0000"),
    );
    expect(backgrounds(cells)).toEqual(["#404040", "#bfbfbf"]);
  });

  it("a see-through gradient shows the color under it", () => {
    const cells = gradientRow(
      4,
      "linear-gradient(to right, transparent, #ffffff)",
      (root) => root.setBackgroundColor("#000000"),
    );
    expect(backgrounds(cells)).toEqual(["#202020", "#606060", "#9f9f9f", "#dfdfdf"]);
  });

  it('setBackgroundImage("none") goes back to the color', () => {
    const cells = gradientRow(2, BLACK_TO_WHITE, (root) =>
      root.setBackgroundColor("#ff0000").setBackgroundImage("none"),
    );
    expect(backgrounds(cells)).toEqual(["#ff0000", "#ff0000"]);
  });
});

describe("radial gradients", () => {
  it("the center is the first color, the corners darker, symmetric", () => {
    const { canvas, root } = screen(5, 5);
    (root as any).setBackgroundImage("radial-gradient(#ffffff, #000000)");
    const cells = paint(root, canvas);

    expect(cells[2][2].background).eq("#ffffff");
    expect(cells[0][0].background).eq(cells[4][4].background);
    expect(cells[0][0].background).not.eq("#ffffff");
  });
});

describe("clipping", () => {
  it("a gradient in a scrolled or clipped parent only paints what's inside it", () => {
    const { canvas, root } = screen(4, 1);
    root.setDirection("horizontal").setBackgroundColor("#00ff00");
    const clip = box(2, 1).setOverflow("hidden");
    const wide = box(4, 1) as any;
    wide.setBackgroundImage(BLACK_TO_WHITE);
    clip.addChildren(wide);
    root.addChildren(clip);

    expect(backgrounds(paint(root, canvas))).toEqual([
      "#202020",
      "#606060",
      "#00ff00",
      "#00ff00",
    ]);
  });
});
