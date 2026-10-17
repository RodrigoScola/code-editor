import { beforeEach, describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { ColorParser } from "../../../../src/ui/colors/Parsers/ColorParser.js";
import { AnsiParser } from "../../../../src/ui/colors/Parsers/AnsiParser.js";

// The last levels of terminal-color.test.ts: making the conversion cheap
// enough to run for every cell of every frame. Do these after that file
// passes.
//
// 14. the cache, checked exactly (no timing):
//   colors.terminalCacheSize()    how many conversions are stored
//   colors.clearTerminalCache()   forgets them all
//   colors.TERMINAL_CACHE_LIMIT   the most it ever stores
//
//   A screen has a few distinct colors and thousands of cells, so each hex
//   color is converted once and looked up after that. ANSI codes need no
//   conversion (and neither do the
//   keywords "transparent" and "initial"), so they never take space. And it can't grow forever:
//   gradients and animations make new colors every frame.
//
// 15. the speed, compared to baselines timed in the same run, so the specs
//   don't depend on how fast the machine is: "about as cheap as one Map
//   lookup", "faster than a regex". Each is the best of several runs after
//   a warm-up. The full run (npx vitest run) times these next to other
//   files; if one fails only there, run this file alone. For the actual
//   numbers: npm run bench (test/perf/terminal-color.bench.ts).

const isHex = ColorParser.ValidHex;
const parseHex = ColorParser.ToHex;
const toTerminal = AnsiParser.toTerminal;

const clearCache = AnsiParser.clearCache;
const size = AnsiParser.cacheSize;
const limit = AnsiParser.cacheLimit;

beforeEach(() => {
  AnsiParser.clearCache();
});

// "#000000", "#010203", ... count different hex colors
function hexColors(count: number, offset = 0) {
  return Array.from(
    { length: count },
    (_, i) => "#" + (i + offset).toString(16).padStart(6, "0"),
  );
}

describe.skip("14. the cache", () => {
  it("is empty after clearTerminalCache()", () => {
    toTerminal("#ff0000", true);
    clearCache();

    expect(size()).eq(0);
  });

  it("converting a hex color stores it once", () => {
    toTerminal("#ff0000", true);
    expect(size()).eq(1);
  });

  it("converting it again doesn't store it again", () => {
    for (let i = 0; i < 1000; i++) {
      toTerminal("#ff0000", true);
    }
    expect(size()).eq(1);
  });

  it("as background and as foreground are two entries", () => {
    toTerminal("#ff0000", true);
    toTerminal("#ff0000", false);
    expect(size()).eq(2);
  });

  it("escape codes and the default keywords are never stored", () => {
    for (const color of ["\x1b[44m", "\x1b[48;5;208m", colors.BACKGROUND_OFF]) {
      toTerminal(color, true);
    }
    toTerminal("\x1b[31m", false);
    toTerminal(colors.FOREGROUND_OFF, false);

    expect(size()).eq(0);
  });

  it("a bad hex isn't stored", () => {
    const result = toTerminal("#ggg", true);
    expect(result).eq("#ggg");
    expect(size()).eq(0);
  });

  it("parseHex() alone doesn't fill it", () => {
    parseHex("#ff0000");
    expect(size()).eq(0);
  });

  it("the limit is at least a screen's worth of colors, and bounded", () => {
    expect(limit()).toBeGreaterThanOrEqual(256);
    expect(limit()).toBeLessThanOrEqual(65_536);
  });

  it("never holds more than the limit, however many colors go through", () => {
    const many = hexColors(100_000);
    for (let i = 0; i < many.length; i++) {
      toTerminal(many[i], true);
      if (i % 997 === 0) {
        expect(size()).toBeLessThanOrEqual(limit());
      }
    }
    expect(size()).toBeLessThanOrEqual(limit());
  });

  it("answers are still right after it filled up", () => {
    const first = toTerminal("#123456", true);
    for (const color of hexColors(100_000, 1)) {
      toTerminal(color, false);
    }

    expect(toTerminal("#123456", true)).eq(first);
    expect(toTerminal("#ff0000", false)).eq("\x1b[38;2;255;0;0m");
    expect(toTerminal("#00ff00", true)).eq("\x1b[48;2;0;255;0m");
  });
});

// ---- timing ----

// a value the timed loops add to, so the engine can't skip the work
let sink = 0;

// the fastest of several runs of fn, in ms, after warming it up
function fastest(fn: () => void, runs = 9) {
  fn();
  fn();
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

// how many times slower `measured` is than `baseline`
function ratio(measured: () => void, baseline: () => void) {
  // alternate, so neither one always gets the warmer machine
  const a1 = fastest(baseline);
  const m1 = fastest(measured);
  const a2 = fastest(baseline);
  const m2 = fastest(measured);
  return Math.min(m1, m2) / Math.min(a1, a2);
}

const LOOPS = 20_000;

// 32 colors, like a themed screen
const SCREEN = hexColors(32).map(
  (_, i) =>
    "#" + ((i * 0x0a1b2c + 0x102030) & 0xffffff).toString(16).padStart(6, "0"),
);
// colors that need no conversion: escape codes, sent as they are
const ANSI = ["\x1b[44m", "\x1b[41m", "\x1b[49m", "\x1b[48;5;208m"];

// the obvious way to parse a hex color, for comparison
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
function regexParse(color: string) {
  const match = HEX.exec(color);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

describe("15. speed", () => {
  it("isHex costs about one character comparison (at most 3x)", () => {
    const inputs = [...SCREEN, ...ANSI];
    const times = ratio(
      () => {
        for (let n = 0; n < LOOPS; n++)
          for (let i = 0; i < inputs.length; i++) if (isHex(inputs[i])) sink++;
      },
      () => {
        for (let n = 0; n < LOOPS; n++)
          for (let i = 0; i < inputs.length; i++)
            if (inputs[i].charCodeAt(0) === 35) sink++;
      },
    );
    expect(times).toBeLessThan(3);
  });

  it("toTerminal on an escape code costs about one character comparison (at most 3x)", () => {
    const times = ratio(
      () => {
        for (let n = 0; n < LOOPS; n++)
          for (let i = 0; i < ANSI.length; i++)
            sink += toTerminal(ANSI[i], true).length;
      },
      () => {
        for (let n = 0; n < LOOPS; n++)
          for (let i = 0; i < ANSI.length; i++)
            sink += (ANSI[i].charCodeAt(0) === 35 ? "" : ANSI[i]).length;
      },
    );
    expect(times).toBeLessThan(3);
  });

  // building a key per call ("bg" + color) costs more than the lookup
  // itself; one Map per layer doesn't need a key
  it("toTerminal on a color it has seen costs about one Map lookup (at most 3x)", () => {
    // the real answers, which also puts every color in toTerminal's cache
    const map = new Map(SCREEN.map((c) => [c, toTerminal(c, true)]));

    const times = ratio(
      () => {
        for (let n = 0; n < LOOPS; n++)
          for (let i = 0; i < SCREEN.length; i++)
            sink += toTerminal(SCREEN[i], true).length;
      },
      () => {
        for (let n = 0; n < LOOPS; n++)
          for (let i = 0; i < SCREEN.length; i++)
            sink += map.get(SCREEN[i])!.length;
      },
    );
    expect(times).toBeLessThan(3);
  });

  // a character-code loop is about 10x faster than the regex; slice() and
  // parseInt() without the regex land around half
  it("parseHex is at least twice as fast as a regex and parseInt", () => {
    const inputs = [...SCREEN, "#f80", "#ABC", "#ggg", "red"];
    const loops = LOOPS / 10;
    const times = ratio(
      () => {
        for (let n = 0; n < loops; n++)
          for (let i = 0; i < inputs.length; i++)
            if (parseHex(inputs[i])) sink++;
      },
      () => {
        for (let n = 0; n < loops; n++)
          for (let i = 0; i < inputs.length; i++)
            if (regexParse(inputs[i])) sink++;
      },
    );
    expect(times).toBeLessThan(0.5);
  });

  it("a whole 200 x 50 frame of cells converts faster than parsing each cell", () => {
    const cells = Array.from(
      { length: 200 * 50 },
      (_, i) => SCREEN[i % SCREEN.length],
    );
    const times = ratio(
      () => {
        for (let i = 0; i < cells.length; i++) {
          sink += toTerminal(cells[i], true).length;
          sink += toTerminal(cells[i], false).length;
        }
      },
      () => {
        for (let i = 0; i < cells.length; i++) {
          if (regexParse(cells[i])) sink++;
          if (regexParse(cells[i])) sink++;
        }
      },
    );
    expect(times).toBeLessThan(0.5);
  });
});
