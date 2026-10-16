import { expect, it } from "vitest";
import { at, cells, fill, later, style, write } from "./helpers.js";

// Level 1: see-through backgrounds on the cell canvas (src/ui/canvas.ts),
// before any renderer. Parked: see helpers.ts.
//
// A cell has one background color. Painting a see-through color
// ("rgba(255, 255, 255, 0.5)", "#ffffff80") over a cell blends it with what
// the cell already has, right away, and the cell keeps the result as a CSS
// color: "#rrggbb", lower case.
//
// Over a cell nothing has painted yet (the terminal's or the window's own
// background, which the canvas doesn't know), there is nothing to blend
// with: the cell keeps the see-through color itself, "#rrggbbaa", and the
// renderer finishes the blend (levels 3 and 4).
//
// An opaque fill replaces the cell, character included, as it does today. A
// see-through fill is a layer over what's there: the character stays, and
// its color is tinted too. That's what makes a dimmed backdrop behind a
// dialog work.

later("1. see-through backgrounds on the canvas", () => {
  it("half white over black is gray", () => {
    const canvas = cells(2);
    fill(canvas, 0, 0, 2, 1, style().setBackgroundColor("#000000"));
    fill(canvas, 0, 0, 2, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0).background).eq("#808080");
    expect(at(canvas, 1, 0).background).eq("#808080");
  });

  it("#rrggbbaa works the same", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#ffffff80"));

    expect(at(canvas, 0, 0).background).eq("#808080");
  });

  it("half black over blue darkens it", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#2472c8"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(0, 0, 0, 0.5)"));

    expect(at(canvas, 0, 0).background).eq("#123964");
  });

  it("only the cells it covers", () => {
    const canvas = cells(3);
    fill(canvas, 0, 0, 3, 1, style().setBackgroundColor("#000000"));
    fill(canvas, 1, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0).background).eq("#000000");
    expect(at(canvas, 1, 0).background).eq("#808080");
    expect(at(canvas, 2, 0).background).eq("#000000");
  });

  it("over different colors, each cell blends with its own", () => {
    const canvas = cells(2);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    fill(canvas, 1, 0, 1, 1, style().setBackgroundColor("#ffffff"));
    fill(canvas, 0, 0, 2, 1, style().setBackgroundColor("rgba(255, 0, 0, 0.5)"));

    expect(at(canvas, 0, 0).background).eq("#800000");
    expect(at(canvas, 1, 0).background).eq("#ff8080");
  });

  // each layer is painted into the cell as a whole-number color before the
  // next one blends over it: 128, then 128 + 255/2 = 191.5 -> 192
  it("layers stack", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0).background).eq("#c0c0c0");
  });

  it("transparent changes nothing", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#2472c8"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("transparent"));

    expect(at(canvas, 0, 0).background).eq("#2472c8");
  });

  it("an opaque color replaces what was there", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#2472c8"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#ff0000"));

    expect(at(canvas, 0, 0).background).eq("#ff0000");
  });

  it("alpha 1 is opaque: it replaces", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#2472c8"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 0, 0, 1)"));

    expect(at(canvas, 0, 0).background).eq("#ff0000");
  });
});

later("1. over a cell nothing has painted", () => {
  it("keeps the see-through color for the renderer to finish", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0).background).eq("#ffffff80");
  });

  it("an opaque layer over it later replaces it", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));

    expect(at(canvas, 0, 0).background).eq("#000000");
  });

  it("clear() makes every cell unpainted again", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    canvas.clear();
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0).background).eq("#ffffff80");
  });
});

later("1. a see-through layer over text", () => {
  it("an opaque fill replaces the character, as today", () => {
    const canvas = cells(1);
    write(canvas, 0, 0, "x", style().setBackgroundColor("#2472c8"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));

    expect(at(canvas, 0, 0).char).eq(" ");
  });

  it("a see-through fill keeps the character", () => {
    const canvas = cells(1);
    write(canvas, 0, 0, "x", style().setBackgroundColor("#2472c8"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(0, 0, 0, 0.5)"));

    expect(at(canvas, 0, 0).char).eq("x");
  });

  it("and tints both its colors", () => {
    const canvas = cells(1);
    write(
      canvas,
      0,
      0,
      "x",
      style().setBackgroundColor("#2472c8").setColor("#ffffff"),
    );
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(0, 0, 0, 0.5)"));

    expect(at(canvas, 0, 0)).toEqual({
      char: "x",
      background: "#123964",
      color: "#808080",
    });
  });

  it("the clip still decides which cells it covers", () => {
    const canvas = cells(3);
    fill(canvas, 0, 0, 3, 1, style().setBackgroundColor("#000000"));
    canvas.setClip(cells(1).layout().clone().setX(1).setWidth(1));
    fill(canvas, 0, 0, 3, 1, style().setBackgroundColor("rgba(255, 255, 255, 0.5)"));
    canvas.setClip(null);

    expect(at(canvas, 0, 0).background).eq("#000000");
    expect(at(canvas, 1, 0).background).eq("#808080");
    expect(at(canvas, 2, 0).background).eq("#000000");
  });
});
