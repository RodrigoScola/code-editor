import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/display/displayComponent.js";
import { TerminalRenderer } from "../../../../src/ui/TerminalRenderer.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

const isHex = colors.isHex;
const parseHex = colors.parseHex;
const toTerminal = colors.toTerminal;

// Colors are CSS colors everywhere in the UI engine: the named colors in
// colors.ts are "#rrggbb", and styles keep whatever they were given. Only the
// terminal renderer turns them into escape codes, when it writes a cell
// (TerminalRenderer.cellText); the window renderer can use them as they are.
//
//   colors.BLUE_BACKGROUND ...  "#rrggbb", VS Code's terminal palette. The
//                               _BACKGROUND and _FOREGROUND of a color are
//                               the same CSS color; the names say where it's
//                               meant to go
//   colors.BACKGROUND_OFF       "transparent": nothing painted, the
//                               terminal's own background shows
//   colors.FOREGROUND_OFF       "initial": the terminal's own text color
//
//   colors.isHex(color)         the cheap check for the render loop: does it
//                               start with "#"?
//   colors.parseHex(color)      { r, g, b } for "#rrggbb" / "#rgb", any case,
//                               or null for anything else. The strict check
//   colors.toTerminal(color, layer)
//                               layer is "background" or "foreground":
//                               "#rrggbb"     -> ESC[48;2;r;g;bm / ESC[38;2;r;g;bm
//                               "transparent" -> ESC[49m (default background)
//                               "initial"     -> ESC[39m (default foreground)
//                               an escape code already ("\x1b[44m") comes
//                               back as it is; a "#..." that isn't a hex
//                               color throws
//
// Setting a color that starts with "#" but isn't one throws right away, so
// a typo fails where it was written, not in the middle of a frame.
//
// Ordered easiest first: make 1 pass, then 2, and so on. The cache and the
// speed come last, in terminal-color.perf.test.ts.

// the named colors and the CSS color each one is
const PALETTE: [string, string][] = [
  ["BLACK", "#000000"],
  ["RED", "#cd3131"],
  ["GREEN", "#0dbc79"],
  ["YELLOW", "#e5e510"],
  ["BLUE", "#2472c8"],
  ["MAGENTA", "#bc3fbc"],
  ["CYAN", "#11a8cd"],
  ["WHITE", "#e5e5e5"],
  ["BRIGHT_BLACK", "#666666"],
  ["BRIGHT_RED", "#f14c4c"],
  ["BRIGHT_GREEN", "#23d18b"],
  ["BRIGHT_YELLOW", "#f5f543"],
  ["BRIGHT_BLUE", "#3b8eea"],
  ["BRIGHT_MAGENTA", "#d670d6"],
  ["BRIGHT_CYAN", "#29b8db"],
  ["BRIGHT_WHITE", "#ffffff"],
  // these were the 256-color palette entries 208, 205, 141, ...
  ["ORANGE", "#ff8700"],
  ["PINK", "#ff5faf"],
  ["PURPLE", "#af87ff"],
  ["LIME", "#87ff00"],
  ["TEAL", "#5fd7d7"],
  ["SKY_BLUE", "#87d7ff"],
  ["GOLD", "#ffd700"],
  ["GRAY", "#8a8a8a"],
  ["DARK_GRAY", "#585858"],
];

const table = colors as unknown as Record<string, string>;

describe("1. the named colors are CSS colors", () => {
  it.each(PALETTE)("%s_BACKGROUND is %s", (name, css) => {
    expect(table[`${name}_BACKGROUND`]).eq(css);
  });

  it.each(PALETTE)("%s_FOREGROUND is %s", (name, css) => {
    expect(table[`${name}_FOREGROUND`]).eq(css);
  });

  it('BACKGROUND_OFF is "transparent"', () => {
    expect(colors.BACKGROUND_OFF).eq("transparent");
  });

  it('FOREGROUND_OFF is "initial"', () => {
    expect(colors.FOREGROUND_OFF).eq("initial");
  });

  it("no named color is an escape code any more", () => {
    const named = Object.entries(table).filter(
      ([key, value]) => /^[A-Z_]+$/.test(key) && typeof value === "string",
    );
    expect(named.length).toBeGreaterThan(50);
    for (const [key, value] of named) {
      expect(value, key).not.toContain("\x1b");
    }
  });
});

describe("2. isHex: the cheap check", () => {
  it.each(["#ff0000", "#f00", "#FFFFFF"])("%s is", (color) => {
    expect(isHex(color)).eq(true);
  });

  it("the named palette colors are", () => {
    expect(isHex(colors.BLUE_BACKGROUND)).eq(true);
    expect(isHex(colors.ORANGE_FOREGROUND)).eq(true);
  });

  it.each([
    ["transparent", "transparent"],
    ["initial", "initial"],
    ["an escape code", "\x1b[44m"],
    ["the empty string (and it doesn't throw)", ""],
  ])("%s isn't", (_name, color) => {
    expect(isHex(color)).eq(false);
  });
});

// parseHex hands back a pooled ColorOptions, whose channels are getters, so
// toEqual can't compare it to a plain object. This reads them out and gives
// the object back to the pool
function channels(color: string) {
  const out = parseHex(color);
  if (!out) {
    return null;
  }
  const read = { red: out.red, green: out.green, blue: out.blue };
  out.dispose();
  return read;
}

describe("3. parseHex: #rrggbb, lower case", () => {
  it("red", () => {
    expect(channels("#ff0000")).toEqual({ red: 255, green: 0, blue: 0 });
  });

  it("each pair is one channel, in order", () => {
    expect(channels("#123456")).toEqual({ red: 18, green: 52, blue: 86 });
  });

  it("black and white", () => {
    expect(channels("#000000")).toEqual({ red: 0, green: 0, blue: 0 });
    expect(channels("#ffffff")).toEqual({ red: 255, green: 255, blue: 255 });
  });

  it("a named color", () => {
    expect(channels(colors.BLUE_BACKGROUND)).toEqual({
      red: 36,
      green: 114,
      blue: 200,
    });
  });

  it("r, g and b are the same as red, green and blue", () => {
    const out = parseHex("#123456")!;
    expect([out.r, out.g, out.b]).toEqual([out.red, out.green, out.blue]);
    out.dispose();
  });

  // a pooled object that's handed out again must not keep the last color
  it("parsing again after dispose() gives the new color", () => {
    parseHex("#ffffff")!.dispose();
    expect(channels("#010203")).toEqual({ red: 1, green: 2, blue: 3 });
  });
});

describe("4. parseHex: any case", () => {
  it("upper case", () => {
    expect(channels("#0A0B0C")).toEqual({ red: 10, green: 11, blue: 12 });
  });

  it("mixed case", () => {
    expect(channels("#aBcDeF")).toEqual({ red: 171, green: 205, blue: 239 });
  });
});

describe("5. parseHex: #rgb, each digit doubled", () => {
  it("#f80 is #ff8800", () => {
    expect(channels("#f80")).toEqual({ red: 255, green: 136, blue: 0 });
  });

  it("#123 is #112233", () => {
    expect(channels("#123")).toEqual({ red: 17, green: 34, blue: 51 });
  });

  it("upper case", () => {
    expect(channels("#FFF")).toEqual({ red: 255, green: 255, blue: 255 });
  });
});

describe("6. parseHex: anything else is null", () => {
  it.each([
    ["the empty string", ""],
    ["only #", "#"],
    ["no #", "ff0000"],
    ["4 digits", "#ff00"],
    ["5 digits", "#ff000"],
    ["7 digits", "#ff00000"],
    ["8 digits (alpha has no meaning in a terminal cell)", "#ff0000ff"],
    ["a letter past f", "#ggg"],
    ["a letter past f, long form", "#12345g"],
    // the characters right next to the ranges, where an off-by-one in a
    // character-code check would let them through
    ["a character between 9 and A", "#12:456"],
    ["a character between F and a", "#12G456"],
    ["the character before 0", "#12/456"],
    ["the character after f", "#12g456"],
    ["a space before", " #fff"],
    ["a space after", "#fff "],
    ["an escape code", "\x1b[41m"],
    ["a name", "red"],
    ["transparent", "transparent"],
  ])("%s", (_name, color) => {
    expect(parseHex(color)).toBeNull();
  });
});

describe("7. toTerminal: the defaults and escape codes", () => {
  it("transparent background is the default background, ESC[49m", () => {
    expect(toTerminal(colors.BACKGROUND_OFF, true)).eq("\x1b[49m");
  });

  it("initial foreground is the default text color, ESC[39m", () => {
    expect(toTerminal(colors.FOREGROUND_OFF, false)).eq("\x1b[39m");
  });

  it.each([
    ["a background code", "\x1b[44m", "background"],
    ["a 256-color background code", "\x1b[48;5;208m", "background"],
    ["a foreground code", "\x1b[31m", "foreground"],
    ["a 24-bit code", "\x1b[38;2;1;2;3m", "foreground"],
  ] as const)("%s comes back as it is", (_name, code, layer) => {
    const terminalColor = toTerminal(code, layer === "background");
    expect(terminalColor).eq(code);
  });
});

describe("8. toTerminal: hex colors", () => {
  it("background: ESC[48;2;r;g;bm", () => {
    expect(toTerminal("#ff0000", true)).eq("\x1b[48;2;255;0;0m");
  });

  it("foreground: ESC[38;2;r;g;bm", () => {
    expect(toTerminal("#ff0000", false)).eq("\x1b[38;2;255;0;0m");
  });

  it("the channels are decimal, not hex", () => {
    expect(toTerminal("#123456", true)).eq("\x1b[48;2;18;52;86m");
  });

  it("short #rgb", () => {
    expect(toTerminal("#f80", true)).eq("\x1b[48;2;255;136;0m");
  });

  it("upper case", () => {
    expect(toTerminal("#0A0B0C", false)).eq("\x1b[38;2;10;11;12m");
  });

  it("black is 0;0;0, not left out", () => {
    expect(toTerminal("#000000", true)).eq("\x1b[48;2;0;0;0m");
  });

  it("the result has no # left in it", () => {
    expect(toTerminal("#abcdef", true)).not.toContain("#");
  });
});

describe("9. toTerminal: the named colors", () => {
  it("BLUE_BACKGROUND as a background", () => {
    expect(toTerminal(colors.BLUE_BACKGROUND, true)).eq(
      "\x1b[48;2;36;114;200m",
    );
  });

  it("RED_FOREGROUND as a foreground", () => {
    expect(toTerminal(colors.RED_FOREGROUND, false)).eq("\x1b[38;2;205;49;49m");
  });

  it("a 256-palette name", () => {
    expect(toTerminal(colors.ORANGE_BACKGROUND, true)).eq(
      "\x1b[48;2;255;135;0m",
    );
  });

  it("every named color converts without throwing", () => {
    for (const [name] of PALETTE) {
      expect(
        () => toTerminal(table[`${name}_BACKGROUND`], true),
        name,
      ).not.toThrow();
      expect(
        () => toTerminal(table[`${name}_FOREGROUND`], false),
        name,
      ).not.toThrow();
    }
  });
});

// these go wrong once there is a cache (terminal-color.perf.test.ts): a
// cache keyed only by the color hands the background code back for the
// foreground
describe("10. toTerminal: asking again", () => {
  it("asking again gives the same answer", () => {
    const first = toTerminal("#123456", false);
    expect(toTerminal("#123456", false)).eq(first);
  });

  it("the same color as background, then foreground: two codes", () => {
    expect(toTerminal("#00ff00", true)).eq("\x1b[48;2;0;255;0m");
    expect(toTerminal("#00ff00", false)).eq("\x1b[38;2;0;255;0m");
  });

  it("as foreground, then background: two codes", () => {
    expect(toTerminal("#0000ff", false)).eq("\x1b[38;2;0;0;255m");
    expect(toTerminal("#0000ff", true)).eq("\x1b[48;2;0;0;255m");
  });

  it("#f80 and #ff8800 are the same color", () => {
    expect(toTerminal("#f80", true)).eq(toTerminal("#ff8800", true));
  });
});

describe("11. setting a color checks it right away", () => {
  it("a good hex is fine", () => {
    expect(() =>
      new DisplayComponent().setBackgroundColor("#ff0000").setColor("#f80"),
    ).not.toThrow();
  });

  it("the named colors are fine", () => {
    expect(() =>
      new DisplayComponent()
        .setBackgroundColor(colors.BLUE_BACKGROUND)
        .setColor(colors.RED_FOREGROUND)
        .setBackgroundColor(colors.BACKGROUND_OFF)
        .setColor(colors.FOREGROUND_OFF),
    ).not.toThrow();
  });

  it("the style keeps the color as it was given", () => {
    const component = new DisplayComponent().setBackgroundColor("#ff0000");
    expect(component.backgroundColor()).eq("#ff0000");
  });

  it("a named color is kept as its CSS color", () => {
    const component = new DisplayComponent().setColor(colors.GREEN_FOREGROUND);
    expect(component.color()).eq("#0dbc79");
  });
});

// the whole way: a component's colors through TerminalRenderer to the frame
// the terminal gets
describe("12. the terminal renderer sends escape codes, never CSS", () => {
  function frame(style: (c: DisplayComponent) => void) {
    const { canvas, root } = screen(2, 1);
    root.setContent("x");
    style(root);
    layoutAndPaint(root, canvas);
    const renderer = new TerminalRenderer(canvas).setOutput(() => {});
    return renderer.build(root).render() as unknown as string;
  }

  it("a named background", () => {
    const sent = frame((c) => c.setBackgroundColor(colors.BLUE_BACKGROUND));

    expect(sent).toContain("\x1b[48;2;36;114;200m");
    expect(sent).not.toContain("#2472c8");
  });

  it("a named text color", () => {
    const sent = frame((c) => c.setColor(colors.RED_FOREGROUND));

    expect(sent).toContain("\x1b[38;2;205;49;49m");
    expect(sent).not.toContain("#cd3131");
  });

  it("a hex color", () => {
    expect(frame((c) => c.setBackgroundColor("#123456"))).toContain(
      "\x1b[48;2;18;52;86m",
    );
  });

  it("the same color for background and text gets one code of each", () => {
    const sent = frame((c) =>
      c
        .setBackgroundColor(colors.WHITE_BACKGROUND)
        .setColor(colors.WHITE_FOREGROUND),
    );

    expect(sent).toContain("\x1b[48;2;229;229;229m");
    expect(sent).toContain("\x1b[38;2;229;229;229m");
  });

  it("no CSS reaches the terminal: no #, no keywords", () => {
    const sent = frame((c) =>
      c
        .setBackgroundColor(colors.GOLD_BACKGROUND)
        .setColor(colors.FOREGROUND_OFF),
    );

    expect(sent).not.toContain("#");
    expect(sent).not.toContain("transparent");
    expect(sent).not.toContain("initial");
  });

  it("an unstyled component sends no 24-bit colors", () => {
    expect(frame(() => {})).not.toContain(";2;");
  });

  it("the plain text is still just the text", () => {
    const sent = frame((c) => c.setBackgroundColor(colors.BLUE_BACKGROUND));
    expect(sent.replace(/\x1b\[[0-9;?<>]*[A-Za-z]/g, "")).eq("x ");
  });
});
