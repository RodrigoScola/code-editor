import { expect, it } from "vitest";
import { at, cells, fill, later, style, write } from "./helpers.js";

// Level 2: see-through text colors on the canvas. Parked: see helpers.ts.
//
// A character's color is blended with the background of its cell (the one
// it ends up with, after the text's own background, if it has one, is
// painted). Fully transparent text isn't drawn at all: the cell keeps what
// it had.

later("2. see-through text", () => {
  it("half white text on black is gray", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    write(canvas, 0, 0, "x", style().setColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0)).toMatchObject({ char: "x", color: "#808080" });
  });

  it("blends with the background under each character", () => {
    const canvas = cells(2);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    fill(canvas, 1, 0, 1, 1, style().setBackgroundColor("#0000ff"));
    write(canvas, 0, 0, "ab", style().setColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0).color).eq("#808080");
    expect(at(canvas, 1, 0).color).eq("#8080ff");
  });

  it("with its own background, it blends with that one", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    write(
      canvas,
      0,
      0,
      "x",
      style().setBackgroundColor("#0000ff").setColor("rgba(255, 255, 255, 0.5)"),
    );

    expect(at(canvas, 0, 0)).toEqual({
      char: "x",
      background: "#0000ff",
      color: "#8080ff",
    });
  });

  it("a see-through background on the text is blended first", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    write(
      canvas,
      0,
      0,
      "x",
      style()
        .setBackgroundColor("rgba(255, 255, 255, 0.5)")
        .setColor("rgba(255, 255, 255, 0.5)"),
    );

    // background: 128; text: half white over 128 = 191.5 -> 192
    expect(at(canvas, 0, 0)).toEqual({
      char: "x",
      background: "#808080",
      color: "#c0c0c0",
    });
  });

  it("opaque text keeps its color", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    write(canvas, 0, 0, "x", style().setColor("#ff0000"));

    expect(at(canvas, 0, 0).color).eq("#ff0000");
  });

  it("fully transparent text isn't drawn: the cell keeps what it had", () => {
    const canvas = cells(1);
    write(canvas, 0, 0, "a", style().setBackgroundColor("#000000").setColor("#ffffff"));
    write(canvas, 0, 0, "b", style().setColor("transparent"));

    expect(at(canvas, 0, 0)).toEqual({
      char: "a",
      background: "#000000",
      color: "#ffffff",
    });
  });

  it("see-through text over a cell nothing has painted keeps its alpha", () => {
    const canvas = cells(1);
    write(canvas, 0, 0, "x", style().setColor("rgba(255, 255, 255, 0.5)"));

    expect(at(canvas, 0, 0).color).eq("#ffffff80");
  });

  it("a see-through layer painted over see-through text tints it again", () => {
    const canvas = cells(1);
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("#000000"));
    write(canvas, 0, 0, "x", style().setColor("rgba(255, 255, 255, 0.5)"));
    fill(canvas, 0, 0, 1, 1, style().setBackgroundColor("rgba(0, 0, 0, 0.5)"));

    // text 128, then half black over it: 64
    expect(at(canvas, 0, 0)).toEqual({
      char: "x",
      background: "#000000",
      color: "#404040",
    });
  });
});
