import { describe, expect, it } from "vitest";
import colors from "../../../src/ui/colors.js";
import {
  ansiToCss,
  BASIC_COLORS,
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
} from "../../../src/ui/Renderers/ansiColors.js";

// Level 2: turning the editor's colors into pixels' colors. Styles hold ANSI
// codes ("\x1b[44m", src/ui/colors.ts) because the terminal understands
// them; a window needs a real color. ansiToCss(code) reads one SGR color code
// and returns "#rrggbb" (lower case), or null for "the default color".
//
// One function, no window, no editor. The palette is VS Code's dark
// terminal theme.

describe("the defaults", () => {
  it('the default background is "#1e1e1e"', () => {
    expect(DEFAULT_BACKGROUND).eq("#1e1e1e");
  });

  it('the default foreground is "#d4d4d4"', () => {
    expect(DEFAULT_FOREGROUND).eq("#d4d4d4");
  });

  it("39 (default foreground) is null", () => {
    expect(ansiToCss(colors.FOREGROUND_OFF)).toBeNull();
  });

  it("49 (default background) is null", () => {
    expect(ansiToCss(colors.BACKGROUND_OFF)).toBeNull();
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

  const NAMES = ["BLACK", "RED", "GREEN", "YELLOW", "BLUE", "MAGENTA", "CYAN", "WHITE"];

  it.each(NAMES.map((name, i) => [name, name, i]))(
    "%s_FOREGROUND (3x) and %s_BACKGROUND (4x)",
    (name, _same, i) => {
      const table = colors as Record<string, string>;
      expect(ansiToCss(table[`${name}_FOREGROUND`])).eq(PALETTE[i as number]);
      expect(ansiToCss(table[`${name}_BACKGROUND`])).eq(PALETTE[i as number]);
    },
  );

  it.each(NAMES.map((name, i) => [name, name, i]))(
    "BRIGHT_%s_FOREGROUND (9x) and BRIGHT_%s_BACKGROUND (10x)",
    (name, _same, i) => {
      const table = colors as Record<string, string>;
      expect(ansiToCss(table[`BRIGHT_${name}_FOREGROUND`])).eq(
        PALETTE[(i as number) + 8],
      );
      expect(ansiToCss(table[`BRIGHT_${name}_BACKGROUND`])).eq(
        PALETTE[(i as number) + 8],
      );
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

  it.each([
    ["ORANGE", "#ff8700"],
    ["PINK", "#ff5faf"],
    ["PURPLE", "#af87ff"],
    ["LIME", "#87ff00"],
    ["TEAL", "#5fd7d7"],
    ["SKY_BLUE", "#87d7ff"],
    ["GOLD", "#ffd700"],
    ["GRAY", "#8a8a8a"],
    ["DARK_GRAY", "#585858"],
  ])("colors.%s_FOREGROUND / _BACKGROUND is %s", (name, expected) => {
    const table = colors as Record<string, string>;
    expect(ansiToCss(table[`${name}_FOREGROUND`])).eq(expected);
    expect(ansiToCss(table[`${name}_BACKGROUND`])).eq(expected);
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
