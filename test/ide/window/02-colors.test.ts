import { describe, expect, it } from "vitest";
import colors from "../../../src/ui/colors.js";
import {
  ansiToCss,
  BASIC_COLORS,
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
} from "../../../src/ui/Renderers/ansiColors.js";

// Level 2: turning a style's color into a pixel's color. Styles hold CSS
// colors (the named ones in src/ui/colors.ts are "#rrggbb", see
// test/unit/ui/styles/terminal-color.test.ts), which the window can use as
// they are. Escape codes ("\x1b[44m") can still turn up, so ansiToCss(color)
// reads those too. It returns "#rrggbb" (lower case), or null for "the
// default color": "transparent", "initial", ESC[39m and ESC[49m.
//
// One function, no window, no editor. The palette is VS Code's dark
// terminal theme, the same one colors.ts uses.

describe("the defaults", () => {
  it('the default background is "#1e1e1e"', () => {
    expect(DEFAULT_BACKGROUND).eq("#1e1e1e");
  });

  it('the default foreground is "#d4d4d4"', () => {
    expect(DEFAULT_FOREGROUND).eq("#d4d4d4");
  });

  it("39 (default foreground) is null", () => {
    expect(ansiToCss("\x1b[39m")).toBeNull();
  });

  it("49 (default background) is null", () => {
    expect(ansiToCss("\x1b[49m")).toBeNull();
  });

  it('FOREGROUND_OFF ("initial") is null', () => {
    expect(ansiToCss(colors.FOREGROUND_OFF)).toBeNull();
  });

  it('BACKGROUND_OFF ("transparent") is null', () => {
    expect(ansiToCss(colors.BACKGROUND_OFF)).toBeNull();
  });
});

describe("CSS colors are used as they are", () => {
  it("#rrggbb", () => {
    expect(ansiToCss("#2472c8")).eq("#2472c8");
  });

  it("upper case comes back lower case", () => {
    expect(ansiToCss("#2472C8")).eq("#2472c8");
  });

  it("#rgb comes back long", () => {
    expect(ansiToCss("#f80")).eq("#ff8800");
  });

  it("a named color", () => {
    expect(ansiToCss(colors.BLUE_BACKGROUND)).eq("#2472c8");
    expect(ansiToCss(colors.ORANGE_FOREGROUND)).eq("#ff8700");
  });
});

// the 16 colors in code order: black red green yellow blue magenta cyan
// white, then their bright versions
const PALETTE = [
  "#000000", "#cd3131", "#0dbc79", "#e5e510",
  "#2472c8", "#bc3fbc", "#11a8cd", "#e5e5e5",
  "#666666", "#f14c4c", "#23d18b", "#f5f543",
  "#3b8eea", "#d670d6", "#29b8db", "#ffffff",
];

describe("the 16 basic colors", () => {
  it("BASIC_COLORS is the palette, in code order", () => {
    expect(BASIC_COLORS).toEqual(PALETTE);
  });

  const NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

  it.each(NAMES.map((name, i) => [name, 30 + i, 40 + i, i]))(
    "%s: ESC[%im and ESC[%im",
    (_name, fg, bg, i) => {
      expect(ansiToCss(`\x1b[${fg}m`)).eq(PALETTE[i as number]);
      expect(ansiToCss(`\x1b[${bg}m`)).eq(PALETTE[i as number]);
    },
  );

  it.each(NAMES.map((name, i) => [name, 90 + i, 100 + i, i]))(
    "bright %s: ESC[%im and ESC[%im",
    (_name, fg, bg, i) => {
      expect(ansiToCss(`\x1b[${fg}m`)).eq(PALETTE[(i as number) + 8]);
      expect(ansiToCss(`\x1b[${bg}m`)).eq(PALETTE[(i as number) + 8]);
    },
  );
});

describe("the 256-color palette (38;5;n and 48;5;n)", () => {
  it("0-15 are the basic colors", () => {
    expect(ansiToCss("\x1b[38;5;1m")).eq("#cd3131");
    expect(ansiToCss("\x1b[48;5;15m")).eq("#ffffff");
  });

  // 16-231 are a 6x6x6 cube; each channel steps 0, 95, 135, 175, 215, 255
  it.each([
    [16, "#000000"],
    [21, "#0000ff"],
    [46, "#00ff00"],
    [196, "#ff0000"],
    [231, "#ffffff"],
    [67, "#5f87af"],
  ])("cube color %i is %s", (n, expected) => {
    expect(ansiToCss(`\x1b[38;5;${n}m`)).eq(expected);
    expect(ansiToCss(`\x1b[48;5;${n}m`)).eq(expected);
  });

  // 232-255 are 24 grays from 8 to 238, 10 apart
  it.each([
    [232, "#080808"],
    [240, "#585858"],
    [255, "#eeeeee"],
  ])("gray %i is %s", (n, expected) => {
    expect(ansiToCss(`\x1b[38;5;${n}m`)).eq(expected);
  });

  // the 256-color codes colors.ts used to have, before it held CSS colors
  it.each([
    ["orange", 208, "#ff8700"],
    ["pink", 205, "#ff5faf"],
    ["purple", 141, "#af87ff"],
    ["lime", 118, "#87ff00"],
    ["teal", 80, "#5fd7d7"],
    ["sky blue", 117, "#87d7ff"],
    ["gold", 220, "#ffd700"],
    ["gray", 245, "#8a8a8a"],
    ["dark gray", 240, "#585858"],
  ])("%s (%i) is %s", (_name, n, expected) => {
    expect(ansiToCss(`\x1b[38;5;${n}m`)).eq(expected);
    expect(ansiToCss(`\x1b[48;5;${n}m`)).eq(expected);
  });

  it("a number past 255 is null", () => {
    expect(ansiToCss("\x1b[38;5;256m")).toBeNull();
  });
});

describe("true color (38;2;r;g;b and 48;2;r;g;b)", () => {
  it("is the color itself", () => {
    expect(ansiToCss("\x1b[38;2;1;2;3m")).eq("#010203");
    expect(ansiToCss("\x1b[48;2;255;128;0m")).eq("#ff8000");
  });
});

describe("codes that aren't a color are null", () => {
  it.each([
    ["the empty string", ""],
    ["reset (0)", "\x1b[0m"],
    ["bold (1)", "\x1b[1m"],
    ["underline (4)", "\x1b[4m"],
    ["a cursor move", "\x1b[2;3H"],
    ["plain text", "red"],
  ])("%s", (_name, code) => {
    expect(ansiToCss(code)).toBeNull();
  });
});
