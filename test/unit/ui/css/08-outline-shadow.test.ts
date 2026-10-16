import { describe, expect, it } from "vitest";
import { ICONS } from "../../../../src/constants.js";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { backgrounds, box, chars, paint, screen } from "./helpers.js";

// Level 8: drawing outside the box without taking space.
//
//   setOutline("light" | "heavy" | "double" | "round" | "none") / outline()
//   setOutlineColor(color)
//     CSS outline: a border drawn one cell outside the component's box (the
//     border styles in ICONS.borders). It takes no space in the layout and
//     paints over whatever is there, like a focus ring. "none" by default.
//
//   setBoxShadow("x y color") / boxShadow()
//     CSS box-shadow, in cells: the box moved by (x, y), blended
//     (blendColors) under the component, so only the part outside the box
//     shows. It darkens the backgrounds there and keeps their characters.
//     Painted with the component: later siblings paint over it. "none" by
//     default; no blur in a terminal.
//
// Scene: a white 8 x 4 root with padding, and a blue 3 x 1 box "abc" at
// column 2, row 1.

const light = ICONS.borders.light;

function scene(setup: (target: any, root: DisplayComponent) => void) {
  const { canvas, root } = screen(8, 4);
  root.setBackgroundColor("#ffffff").setPaddingLeft(2).setPaddingTop(1);
  const target = box(3, 1, "abc").setBackgroundColor("#0000ff") as any;
  root.addChildren(target);
  setup(target, root);
  return paint(root, canvas);
}

describe("outline", () => {
  it('is "none" by default', () => {
    expect((new DisplayComponent() as any).outline()).eq("none");
  });

  it("draws a border one cell outside the box", () => {
    const cells = scene((t) => t.setOutline("light"));

    expect(chars(cells, 0).slice(1, 6)).eq(
      light.top_left + light.top.repeat(3) + light.top_right,
    );
    expect(chars(cells, 1).slice(1, 6)).eq(light.left + "abc" + light.right);
    expect(chars(cells, 2).slice(1, 6)).eq(
      light.bottom_left + light.bottom.repeat(3) + light.bottom_right,
    );
  });

  it("other border styles", () => {
    const cells = scene((t) => t.setOutline("double"));
    expect(chars(cells, 0)[1]).eq(ICONS.borders.double.top_left);
  });

  it("takes no space: the box stays where it was", () => {
    const without = scene(() => {});
    const withOutline = scene((t) => t.setOutline("light"));

    expect(chars(withOutline, 1).slice(2, 5)).eq("abc");
    expect(chars(without, 1).slice(2, 5)).eq("abc");
  });

  it("is painted over what's around it, like a sibling right under the box", () => {
    const cells = scene((t, root) => {
      t.setOutline("light");
      root.addChildren(box(3, 1, "xyz"));
    });
    // the sibling sits on row 2, where the outline's bottom is: the outline
    // is painted after everything, so it wins
    expect(chars(cells, 2).slice(1, 6)).eq(
      light.bottom_left + light.bottom.repeat(3) + light.bottom_right,
    );
  });

  it("the outline color is its characters' color", () => {
    const cells = scene((t) => t.setOutline("light").setOutlineColor("#ff0000"));
    expect(cells[0][1].color).eq("#ff0000");
  });

  it("keeps the backgrounds it is drawn on", () => {
    const cells = scene((t) => t.setOutline("light"));
    expect(cells[0][1].background).eq("#ffffff");
  });

  it("at the edge of the screen it is cut off, without errors", () => {
    const { canvas, root } = screen(3, 1);
    const target = box(3, 1, "abc") as any;
    target.setOutline("light");
    root.addChildren(target);

    expect(chars(paint(root, canvas))).eq("abc");
  });

  it('"none" removes it', () => {
    const cells = scene((t) => t.setOutline("light").setOutline("none"));
    expect(chars(cells, 0)).eq("        ");
  });
});

describe("box-shadow", () => {
  it('is "none" by default', () => {
    expect((new DisplayComponent() as any).boxShadow()).eq("none");
  });

  it("boxShadow() is the string that was set", () => {
    const component = new DisplayComponent() as any;
    component.setBoxShadow("1 1 #000000");
    expect(component.boxShadow()).eq("1 1 #000000");
  });

  it("throws for something it can't read, naming it", () => {
    const component = new DisplayComponent() as any;
    expect(() => component.setBoxShadow("big shadow")).toThrow(/big shadow/);
  });

  it("darkens the cells the moved box covers outside the box", () => {
    const cells = scene((t) => t.setBoxShadow("1 1 rgba(0, 0, 0, 0.5)"));

    // the box is columns 2-4 on row 1; the shadow is columns 3-5 on row 2
    expect(backgrounds(cells, 2).slice(2, 7)).toEqual([
      "#ffffff",
      "#808080",
      "#808080",
      "#808080",
      "#ffffff",
    ]);
  });

  it("only shows outside the box: the box itself is unchanged", () => {
    const cells = scene((t) => t.setBoxShadow("1 1 rgba(0, 0, 0, 0.5)"));
    expect(backgrounds(cells, 1).slice(2, 6)).toEqual([
      "#0000ff",
      "#0000ff",
      "#0000ff",
      "#ffffff",
    ]);
  });

  it("an opaque shadow color", () => {
    const cells = scene((t) => t.setBoxShadow("1 1 #000000"));
    expect(backgrounds(cells, 2)[3]).eq("#000000");
  });

  it("negative offsets go up and left", () => {
    const cells = scene((t) => t.setBoxShadow("-1 0 #000000"));
    expect(backgrounds(cells, 1).slice(1, 3)).toEqual(["#000000", "#0000ff"]);
  });

  it("keeps the characters under it", () => {
    const cells = scene((t, root) => {
      t.setBoxShadow("1 1 rgba(0, 0, 0, 0.5)");
      root.addChildren(box(3, 1, "xyz"));
    });
    expect(chars(cells, 2).slice(2, 5)).eq("xyz");
    expect(backgrounds(cells, 2)[3]).eq("#808080");
  });

  it("a later sibling with a background paints over the shadow", () => {
    const cells = scene((t, root) => {
      t.setBoxShadow("1 1 #000000");
      root.addChildren(box(3, 1, "xyz").setBackgroundColor("#00ff00"));
    });
    expect(backgrounds(cells, 2).slice(2, 5)).toEqual([
      "#00ff00",
      "#00ff00",
      "#00ff00",
    ]);
    expect(backgrounds(cells, 2)[5]).eq("#000000");
  });

  it("takes no space in the layout", () => {
    const cells = scene((t, root) => {
      t.setBoxShadow("1 1 #000000");
      root.addChildren(box(3, 1, "xyz"));
    });
    expect(chars(cells, 2).slice(2, 5)).eq("xyz");
  });

  it('"none" removes it', () => {
    const cells = scene((t) => t.setBoxShadow("1 1 #000000").setBoxShadow("none"));
    expect(backgrounds(cells, 2)[3]).eq("#ffffff");
  });
});
