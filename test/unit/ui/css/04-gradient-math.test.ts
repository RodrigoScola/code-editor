import { describe, expect, it } from "vitest";
import {
  gradientColorAt,
  parseGradient,
  sampleGradient,
} from "../../../../src/ui/styles/gradient.js";

// Level 4: gradient math, before anything is painted. Pure functions:
//
//   parseGradient(css)
//     linear-gradient(...) / radial-gradient(...) to
//     { type: "linear" | "radial", angle, stops: [{ color, position }] },
//     or null. angle is in degrees, CSS's: 0 points up, 90 right, 180 down
//     (the default). Stop colors are formatColor()ed ("#rrggbb[aa]");
//     positions are 0-1. radial gradients have angle 0.
//
//   gradientColorAt(gradient, t)
//     the color at t (0-1) along the gradient line: the stops' colors mixed
//     (mixColors, so alpha is premultiplied); before the first stop it's the
//     first color, after the last stop the last color.
//
//   sampleGradient(gradient, width, height)
//     the color of every cell, [row][column], sampled at the cell's center.
//     Cells count as squares. For a linear gradient at angle a, with
//     (dx, dy) the cell center's offset from the box's center:
//       length = |width * sin a| + |height * cos a|
//       t      = (dx * sin a - dy * cos a) / length + 0.5
//     For a radial gradient (a circle reaching the farthest corner):
//       t      = distance from the center / distance to a corner

const stop = (color: string, position: number) => ({ color, position });

describe("parseGradient: linear-gradient direction", () => {
  it("no direction is to bottom (180deg)", () => {
    expect(parseGradient("linear-gradient(#000000, #ffffff)")).toEqual({
      type: "linear",
      angle: 180,
      stops: [stop("#000000", 0), stop("#ffffff", 1)],
    });
  });

  it.each([
    ["to top", 0],
    ["to right", 90],
    ["to bottom", 180],
    ["to left", 270],
    ["45deg", 45],
    ["-90deg", 270],
    ["450deg", 90],
    ["0.25turn", 90],
    ["3.14159265rad", 180],
  ])("%s is %ideg", (direction, angle) => {
    const gradient = parseGradient(`linear-gradient(${direction}, red, blue)`)!;
    expect(gradient.angle).toBeCloseTo(angle, 3);
  });
});

describe("parseGradient: stops", () => {
  it("colors are formatColor()ed", () => {
    const gradient = parseGradient("linear-gradient(red, rgba(0, 0, 255, 0.5))")!;
    expect(gradient.stops.map((s) => s.color)).toEqual(["#ff0000", "#0000ff80"]);
  });

  it("without positions, stops are spread evenly", () => {
    const gradient = parseGradient("linear-gradient(red, lime, blue)")!;
    expect(gradient.stops.map((s) => s.position)).toEqual([0, 0.5, 1]);
  });

  it("a position in percent", () => {
    const gradient = parseGradient("linear-gradient(red 20%, blue 70%)")!;
    expect(gradient.stops.map((s) => s.position)).toEqual([0.2, 0.7]);
  });

  it("stops without a position are spread between the ones around them", () => {
    const gradient = parseGradient(
      "linear-gradient(#000 0%, #111, #222, #fff 90%)",
    )!;
    const positions = gradient.stops.map((s) => s.position);
    [0, 0.3, 0.6, 0.9].forEach((expected, i) =>
      expect(positions[i], `stop ${i}`).toBeCloseTo(expected, 9),
    );
  });

  it("a position before an earlier one is moved up to it", () => {
    const gradient = parseGradient("linear-gradient(red 50%, blue 20%)")!;
    expect(gradient.stops.map((s) => s.position)).toEqual([0.5, 0.5]);
  });

  it("commas inside rgb() aren't stop separators", () => {
    const gradient = parseGradient(
      "linear-gradient(to right, rgb(255, 0, 0), rgb(0, 0, 255))",
    )!;
    expect(gradient.stops).toHaveLength(2);
  });
});

describe("parseGradient: radial-gradient", () => {
  it("is type radial with its stops", () => {
    expect(parseGradient("radial-gradient(#ffffff, #000000)")).toEqual({
      type: "radial",
      angle: 0,
      stops: [stop("#ffffff", 0), stop("#000000", 1)],
    });
  });
});

describe("parseGradient: not a gradient is null", () => {
  it.each([
    ["none", "none"],
    ["a color", "#ff0000"],
    ["no stops", "linear-gradient()"],
    ["one stop", "linear-gradient(red)"],
    ["a bad color", "linear-gradient(red, nope)"],
    ["a bad direction", "linear-gradient(to nowhere, red, blue)"],
    ["an unsupported kind", "conic-gradient(red, blue)"],
  ])("%s", (_name, css) => {
    expect(parseGradient(css)).toBeNull();
  });
});

describe("gradientColorAt", () => {
  const blackToWhite = parseGradient("linear-gradient(#000000, #ffffff)")!;

  it("the ends are the stop colors", () => {
    expect(gradientColorAt(blackToWhite, 0)).eq("#000000");
    expect(gradientColorAt(blackToWhite, 1)).eq("#ffffff");
  });

  it("between stops it mixes them", () => {
    expect(gradientColorAt(blackToWhite, 0.5)).eq("#808080");
    expect(gradientColorAt(blackToWhite, 0.25)).eq("#404040");
  });

  it("before the first stop is the first color", () => {
    const g = parseGradient("linear-gradient(red 30%, blue 70%)")!;
    expect(gradientColorAt(g, 0.1)).eq("#ff0000");
  });

  it("after the last stop is the last color", () => {
    const g = parseGradient("linear-gradient(red 30%, blue 70%)")!;
    expect(gradientColorAt(g, 0.9)).eq("#0000ff");
  });

  it("between the right pair of stops", () => {
    const g = parseGradient("linear-gradient(#000000, #ffffff, #000000)")!;
    expect(gradientColorAt(g, 0.75)).eq("#808080");
  });

  it("two stops at the same place make a hard edge", () => {
    const g = parseGradient("linear-gradient(red 50%, blue 50%)")!;
    expect(gradientColorAt(g, 0.49)).eq("#ff0000");
    expect(gradientColorAt(g, 0.51)).eq("#0000ff");
  });

  it("a see-through stop fades the color, not toward black", () => {
    const g = parseGradient("linear-gradient(transparent, #ffffff)")!;
    expect(gradientColorAt(g, 0.5)).eq("#ffffff80");
  });
});

describe("sampleGradient: linear", () => {
  const blackToWhite = (direction: string) =>
    parseGradient(`linear-gradient(${direction}, #000000, #ffffff)`)!;

  it("to right: each column at its center", () => {
    expect(sampleGradient(blackToWhite("to right"), 4, 1)).toEqual([
      ["#202020", "#606060", "#9f9f9f", "#dfdfdf"],
    ]);
  });

  it("to right: every row the same", () => {
    const rows = sampleGradient(blackToWhite("to right"), 4, 3);
    expect(rows[0]).toEqual(rows[1]);
    expect(rows[1]).toEqual(rows[2]);
  });

  it("to bottom: each row at its center", () => {
    expect(sampleGradient(blackToWhite("to bottom"), 2, 2)).toEqual([
      ["#404040", "#404040"],
      ["#bfbfbf", "#bfbfbf"],
    ]);
  });

  it("to left is to right backwards", () => {
    expect(sampleGradient(blackToWhite("to left"), 4, 1)).toEqual([
      ["#dfdfdf", "#9f9f9f", "#606060", "#202020"],
    ]);
  });

  it("45deg goes from the bottom left to the top right", () => {
    expect(sampleGradient(blackToWhite("45deg"), 2, 2)).toEqual([
      ["#808080", "#bfbfbf"],
      ["#404040", "#808080"],
    ]);
  });

  it("is [height][width]", () => {
    const rows = sampleGradient(blackToWhite("to right"), 5, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveLength(5);
  });

  it("an empty box is no cells", () => {
    expect(sampleGradient(blackToWhite("to right"), 0, 0)).toEqual([]);
  });
});

describe("sampleGradient: radial", () => {
  const radial = parseGradient("radial-gradient(#ffffff, #000000)")!;

  it("the center is the first color's end, the corners the last", () => {
    const rows = sampleGradient(radial, 5, 5);
    const center = rows[2][2];
    const corner = rows[0][0];

    expect(center).eq("#ffffff");
    expect(parseInt(corner.slice(1, 3), 16)).toBeLessThan(80);
  });

  it("is the same in every direction", () => {
    const rows = sampleGradient(radial, 5, 5);

    expect(rows[0][0]).eq(rows[4][4]);
    expect(rows[0][4]).eq(rows[4][0]);
    expect(rows[2][0]).eq(rows[0][2]);
  });
});
