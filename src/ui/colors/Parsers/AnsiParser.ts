import { ColorOptions } from "../colorOptions.js";
import { ColorParser } from "./ColorParser.js";

const TERMINAL_CACHE_LIMIT = 256;

const BACKGROUND_OFF = "\x1b[49m" as const;
const FOREGROUND_OFF = "\x1b[39m" as const;
const ESCAPE = 27; // "\x1b"

export class AnsiParser {
  // one Map per layer, so a lookup needs no key built from color + layer
  private static backgroundCache = new Map<string, string>();
  private static foregroundCache = new Map<string, string>();

  static cacheLimit() {
    return TERMINAL_CACHE_LIMIT;
  }

  // "#rgb", "#rgba", "#rrggbb" or "#rrggbbaa", any case; null for anything else

  static clearCache() {
    AnsiParser.backgroundCache.clear();
    AnsiParser.foregroundCache.clear();
  }

  static cacheSize() {
    return AnsiParser.backgroundCache.size + AnsiParser.foregroundCache.size;
  }

  static getColor(color: string, background: boolean) {
    return (
      background ? AnsiParser.backgroundCache : AnsiParser.foregroundCache
    ).get(color);
  }
  static addColor(color: string, background: boolean, output: string) {
    if (AnsiParser.cacheSize() < TERMINAL_CACHE_LIMIT) {
      (background
        ? AnsiParser.backgroundCache
        : AnsiParser.foregroundCache
      ).set(color, output);
    }
    return output;
  }
  static ToAnsi(color: ColorOptions, background: boolean): string {
    const layer = background ? 48 : 38;
    return `\x1b[${layer};2;${color.r};${color.g};${color.b}m`;
  }

  static toTerminal(color: string, background: boolean): string {
    // already an escape code: sent as it is, and never cached
    if (color.charCodeAt(0) === ESCAPE) {
      return color;
    } else if (color === "transparent") {
      return BACKGROUND_OFF;
    } else if (color === "initial") {
      return FOREGROUND_OFF;
    }

    const terminalColor = AnsiParser.getColor(color, background);
    if (terminalColor) {
      return terminalColor;
    }

    const rgb = ColorParser.FromString(color);

    if (!rgb) {
      return color;
    }

    const output = AnsiParser.ToAnsi(rgb, background);

    AnsiParser.addColor(color, background, output);
    return output;
  }
  static Valid(color: string) {
    if (!color.startsWith("\x1b[") || !color.endsWith("m")) return false;

    const parts = color.slice(2, -1).split(";");
    const byte = (part: string) => {
      const value = Number(part);
      return (
        part !== "" && Number.isInteger(value) && value >= 0 && value <= 255
      );
    };

    // 38;5;n: one of the 256 palette colors
    if (parts[1] === "5") {
      return parts.length === 3 && byte(parts[2]);
    }

    // 38;2;r;g;b: true color
    return parts.length === 5 && parts[1] === "2" && parts.slice(2).every(byte);
  }
  static FromString(color: string): ColorOptions | null {
    if (!AnsiParser.Valid(color)) {
      console.error(`invalid color, ${color}`);
      return null;
    }

    const parts = color.slice(2, -1).split(";");

    // 38;5;n: one of the 256 palette colors
    if (parts[1] === "5") {
      const [r, g, b] = AnsiParser.Palette(Number(parts[2]));
      return ColorOptions.Create(r, g, b).setType("ansi");
    }

    if (parts[1] !== "2" || parts.length !== 5) {
      console.error(`invalid parts`, parts[1], parts.length);
      return null;
    }

    const valid: string[] = parts.slice(2);

    const opts = ColorOptions.Create().setType("ansi");

    const red = valid.at(0);
    const green = valid.at(1);
    const blue = valid.at(2);
    const alpha = valid.at(3);

    red && opts.setRed(ColorParser.Channel(red));
    green && opts.setGreen(ColorParser.Channel(green));
    blue && opts.setBlue(ColorParser.Channel(blue));
    alpha && opts.setAlpha(ColorParser.Alpha(alpha));

    return opts;
  }

  // palette color n (0-255) as [r, g, b]
  static Palette(n: number): readonly [number, number, number] {
    // 0-15: the terminal's own 16 colors; no formula, a theme picks them
    if (n < 16) {
      return FIRST_16[n];
    }

    // 16-231: a 6x6x6 cube; each channel steps 0, 95, 135, 175, 215, 255
    if (n < 232) {
      const i = n - 16;
      const level = (step: number) => (step === 0 ? 0 : 55 + step * 40);
      return [
        level(Math.floor(i / 36)),
        level(Math.floor(i / 6) % 6),
        level(i % 6),
      ];
    }

    // 232-255: 24 grays from 8 to 238, 10 apart
    const gray = 8 + (n - 232) * 10;
    return [gray, gray, gray];
  }
}

// palette 0-15, VS Code's dark terminal theme (the one colors.ts uses):
// black red green yellow blue magenta cyan white, then the bright ones
const FIRST_16: readonly (readonly [number, number, number])[] = [
  [0x00, 0x00, 0x00],
  [0xcd, 0x31, 0x31],
  [0x0d, 0xbc, 0x79],
  [0xe5, 0xe5, 0x10],
  [0x24, 0x72, 0xc8],
  [0xbc, 0x3f, 0xbc],
  [0x11, 0xa8, 0xcd],
  [0xe5, 0xe5, 0xe5],
  [0x66, 0x66, 0x66],
  [0xf1, 0x4c, 0x4c],
  [0x23, 0xd1, 0x8b],
  [0xf5, 0xf5, 0x43],
  [0x3b, 0x8e, 0xea],
  [0xd6, 0x70, 0xd6],
  [0x29, 0xb8, 0xdb],
  [0xff, 0xff, 0xff],
];
