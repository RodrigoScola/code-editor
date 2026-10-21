import { describe, expect, it } from "vitest";
import {
  blendColors,
  formatColor,
  mixColors,
} from "../../../../src/ui/colors/colors.js";
import { ColorOptions } from "../../../../src/ui/colors/colorOptions.js";
import { ColorParser } from "../../../../src/ui/colors/Parsers/ColorParser.js";

const parseColor = ColorParser.FromString;

// Level 2: color math. Everything after this needs it: gradients mix
// colors, opacity and shadows blend them. Pure functions, no components.
//
//   parseColor(css)          { r, g, b, a } (r/g/b 0-255, a 0-1), or null
//   formatColor({r,g,b,a})   "#rrggbb", or "#rrggbbaa" when not opaque
//   mixColors(a, b, t)       the color t of the way from a to b (CSS strings
//                            in, "#rrggbb[aa]" out)
//   blendColors(top, under)  top painted over under ("source over")
//
// ANSI palette codes ("\x1b[44m") are not CSS colors: the terminal decides
// what they look like, so they can't be mixed or blended. Gradients,
// opacity and shadows work with CSS colors.

const rgba = (r: number, g: number, b: number, a = 1) => ({ r, g, b, a });

const p = (color: ColorOptions | null) => ({
  r: color?.red,
  g: color?.green,
  b: color?.blue,
  a: color?.alpha,
});

describe("parseColor: hex", () => {
  it("#rrggbb", () => {
    expect(p(parseColor("#ff8800"))).toEqual(rgba(255, 136, 0));
  });

  it("#rgb doubles each digit", () => {
    expect(p(parseColor("#f80"))).toEqual(rgba(255, 136, 0));
  });

  it("upper case", () => {
    expect(p(parseColor("#FF8800"))).toEqual(rgba(255, 136, 0));
  });

  it("#rrggbbaa has alpha", () => {
    const color = parseColor("#ff880080")!;

    expect(p(color)).toMatchObject({ r: 255, g: 136, b: 0 });
    expect(color.a).toBeCloseTo(128 / 255, 5);
  });

  it("#rgba has alpha", () => {
    const color = parseColor("#f808")!;

    expect(color).toMatchObject({ r: 255, g: 136, b: 0 });
    expect(color.a).toBeCloseTo(0x88 / 255, 5);
  });
});

describe.only("parseColor: rgb() and rgba()", () => {
  it("rgb(r, g, b)", () => {
    const out = parseColor("rgb(255, 136, 0)");

    console.log(out);

    expect(p(out)).toEqual(rgba(255, 136, 0));
  });

  it("rgb(r g b), the space form", () => {
    expect(parseColor("rgb(255 136 0)")).toEqual(rgba(255, 136, 0));
  });

  it("rgba(r, g, b, a)", () => {
    expect(parseColor("rgba(255, 136, 0, 0.5)")).toEqual(
      rgba(255, 136, 0, 0.5),
    );
  });

  it("rgb(r g b / a%)", () => {
    expect(parseColor("rgb(255 136 0 / 50%)")).toEqual(rgba(255, 136, 0, 0.5));
  });

  it("percent channels", () => {
    expect(parseColor("rgb(100%, 0%, 50%)")).toEqual(rgba(255, 0, 128));
  });

  it("clamps channels out of range", () => {
    expect(parseColor("rgb(300, -5, 0)")).toEqual(rgba(255, 0, 0));
  });

  it("clamps alpha out of range", () => {
    expect(parseColor("rgba(0, 0, 0, 2)")).toEqual(rgba(0, 0, 0, 1));
  });

  it("ignores spaces around the parts", () => {
    expect(parseColor("  rgb( 1 ,2,  3 )  ")).toEqual(rgba(1, 2, 3));
  });
});

describe("parseColor: hsl()", () => {
  it("hsl(0, 100%, 50%) is red", () => {
    expect(parseColor("hsl(0, 100%, 50%)")).toEqual(rgba(255, 0, 0));
  });

  it("hsl(120 100% 25%), the space form", () => {
    expect(parseColor("hsl(120 100% 25%)")).toEqual(rgba(0, 128, 0));
  });

  it("hsla(240, 100%, 50%, 0.25)", () => {
    expect(parseColor("hsla(240, 100%, 50%, 0.25)")).toEqual(
      rgba(0, 0, 255, 0.25),
    );
  });

  it("0% saturation is gray", () => {
    expect(parseColor("hsl(200, 0%, 50%)")).toEqual(rgba(128, 128, 128));
  });
});

describe("parseColor: names", () => {
  it.each([
    ["black", rgba(0, 0, 0)],
    ["white", rgba(255, 255, 255)],
    ["red", rgba(255, 0, 0)],
    ["lime", rgba(0, 255, 0)],
    ["blue", rgba(0, 0, 255)],
    ["green", rgba(0, 128, 0)],
    ["gray", rgba(128, 128, 128)],
    ["orange", rgba(255, 165, 0)],
    ["rebeccapurple", rgba(102, 51, 153)],
    ["transparent", rgba(0, 0, 0, 0)],
  ])("%s", (name, expected) => {
    expect(parseColor(name)).toEqual(expected);
  });

  it("any case", () => {
    expect(parseColor("White")).toEqual(rgba(255, 255, 255));
  });
});

describe("parseColor: not a color is null", () => {
  it.each([
    ["the empty string", ""],
    ["a hex with 5 digits", "#12345"],
    ["a hex with a non-hex digit", "#ggg"],
    ["rgb with two channels", "rgb(1, 2)"],
    ["an unknown name", "notacolor"],
    ["an ANSI code", "\x1b[41m"],
  ])("%s", (_name, css) => {
    expect(parseColor(css)).toBeNull();
  });
});

describe("formatColor", () => {
  it('an opaque color is "#rrggbb", lower case', () => {
    expect(formatColor(rgba(255, 136, 0))).eq("#ff8800");
  });

  it('a see-through color is "#rrggbbaa"', () => {
    expect(formatColor(rgba(255, 136, 0, 0.5))).eq("#ff880080");
  });

  it("rounds channels", () => {
    expect(formatColor(rgba(127.5, 0.4, 254.6))).eq("#8000ff");
  });

  it("parse then format gives the color back", () => {
    expect(formatColor(parseColor("rgb(18, 52, 86)")!)).eq("#123456");
  });
});

describe("mixColors: the color between two others", () => {
  it("t = 0 is the first color", () => {
    expect(mixColors("#000000", "#ffffff", 0)).eq("#000000");
  });

  it("t = 1 is the second color", () => {
    expect(mixColors("#000000", "#ffffff", 1)).eq("#ffffff");
  });

  it("halfway rounds .5 up", () => {
    expect(mixColors("#000000", "#ffffff", 0.5)).eq("#808080");
  });

  it("each channel on its own", () => {
    expect(mixColors("#ff0000", "#0000ff", 0.25)).eq("#bf0040");
  });

  it("takes any CSS color", () => {
    expect(mixColors("black", "rgb(255, 255, 255)", 0.5)).eq("#808080");
  });

  // like CSS gradients: colors are mixed with their alpha applied, so
  // fading from transparent to white is white getting more opaque, not
  // passing through gray
  it("mixes with alpha premultiplied: transparent to white stays white", () => {
    expect(mixColors("transparent", "#ffffff", 0.5)).eq("#ffffff80");
  });

  it("two see-through colors", () => {
    expect(mixColors("#ff000000", "#ff0000ff", 0.25)).eq("#ff000040");
  });

  it("throws for something that isn't a color", () => {
    expect(() => mixColors("nope", "#ffffff", 0.5)).toThrow(/nope/);
  });
});

describe("blendColors: one color painted over another", () => {
  it("an opaque color covers what is under it", () => {
    expect(blendColors("#ff0000", "#0000ff")).eq("#ff0000");
  });

  it("half see-through white over black is gray", () => {
    expect(blendColors("rgba(255, 255, 255, 0.5)", "#000000")).eq("#808080");
  });

  it("#rrggbbaa alpha", () => {
    expect(blendColors("#ffffff80", "#000000")).eq("#808080");
  });

  it("transparent leaves what is under it", () => {
    expect(blendColors("transparent", "#123456")).eq("#123456");
  });

  it("a quarter of red over white", () => {
    expect(blendColors("rgba(255, 0, 0, 0.25)", "#ffffff")).eq("#ffbfbf");
  });

  it("over a see-through color, the result is see-through", () => {
    expect(blendColors("rgba(255, 255, 255, 0.5)", "transparent")).eq(
      "#ffffff80",
    );
  });
});
