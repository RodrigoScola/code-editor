import { bench, describe } from "vitest";
import colors from "../../src/ui/colors.js";

// How long the color conversion takes, in real numbers. Run with
// `npm run bench`. The pass/fail checks for these are in
// test/unit/ui/styles/terminal-color.perf.test.ts.

const SCREEN = Array.from(
  { length: 32 },
  (_, i) =>
    "#" + ((i * 0x0a1b2c + 0x102030) & 0xffffff).toString(16).padStart(6, "0"),
);
const ANSI = [colors.BLUE, colors.RED, colors.BACKGROUND_OFF];
const FRAME = Array.from(
  { length: 200 * 50 },
  (_, i) => SCREEN[i % SCREEN.length],
);

let sink = 0;

describe("one call", () => {
  bench("isHex", () => {
    for (const color of SCREEN) if (colors.isHex(color)) sink++;
  });

  bench("parseHex", () => {
    for (const color of SCREEN) if (colors.parseHex(color)) sink++;
  });

  bench("toTerminal, ANSI code", () => {
    for (const color of ANSI)
      sink += colors.toTerminal(color, "background").length;
  });

  bench("toTerminal, hex seen before", () => {
    for (const color of SCREEN)
      sink += colors.toTerminal(color, "background").length;
  });

  bench(
    "toTerminal, hex never seen (cache cleared)",
    () => {
      for (const color of SCREEN)
        sink += colors.toTerminal(color, "background").length;
    },
    { setup: () => colors.clearTerminalCache() },
  );
});

describe("a 200 x 50 frame", () => {
  bench("toTerminal every cell, background and foreground", () => {
    for (const color of FRAME) {
      sink += colors.toTerminal(color, "background").length;
      sink += colors.toTerminal(color, "foreground").length;
    }
  });
});
