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

    const layer = background ? 48 : 38;
    const rgb = ColorParser.FromString(color);

    if (!rgb) {
      return color;
    }

    const output = `\x1b[${layer};2;${rgb.r};${rgb.g};${rgb.b}m`;

    AnsiParser.addColor(color, background, output);
    return output;
  }
  static Valid(color: string) {
    if (!color.startsWith("\x1b[") || !color.endsWith("m")) return false;

    const parts = color.slice(2, -1).split(";");

    return (
      parts.length === 5 &&
      parts[1] === "2" &&
      parts.slice(2).every((part) => {
        const value = Number(part);
        return (
          part !== "" && Number.isInteger(value) && value >= 0 && value <= 255
        );
      })
    );
  }
  static FromString(color: string): ColorOptions | null {
    if (!color.trim().startsWith("\x1b[") || !color.endsWith("m")) return null;

    const parts = color.slice(2, -1).split(";");

    if (parts[1] !== "2" || parts.length !== 5) return null;

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
}
