import { ObjectPool } from "../ObjectPool.js";
import { ColorOptions } from "./colors/colorOptions.js";

const HASH = 35; // "#"

const TERMINAL_CACHE_LIMIT = 256;

const BACKGROUND_OFF = "\x1b[49m" as const;
const FOREGROUND_OFF = "\x1b[39m" as const;

export default {
  // Backgrounds
  BLACK_BACKGROUND: "#000000",
  RED_BACKGROUND: "#cd3131",
  GREEN_BACKGROUND: "#0dbc79",
  YELLOW_BACKGROUND: "#e5e510",
  BLUE_BACKGROUND: "#2472c8",
  MAGENTA_BACKGROUND: "#bc3fbc",
  CYAN_BACKGROUND: "#11a8cd",
  WHITE_BACKGROUND: "#e5e5e5",

  // Bright backgrounds
  BRIGHT_BLACK_BACKGROUND: "#666666",
  BRIGHT_RED_BACKGROUND: "#f14c4c",
  BRIGHT_GREEN_BACKGROUND: "#23d18b",
  BRIGHT_YELLOW_BACKGROUND: "#f5f543",
  BRIGHT_BLUE_BACKGROUND: "#3b8eea",
  BRIGHT_MAGENTA_BACKGROUND: "#d670d6",
  BRIGHT_CYAN_BACKGROUND: "#29b8db",
  BRIGHT_WHITE_BACKGROUND: "#ffffff",

  // Foregrounds
  BLACK_FOREGROUND: "#000000",
  RED_FOREGROUND: "#cd3131",
  GREEN_FOREGROUND: "#0dbc79",
  YELLOW_FOREGROUND: "#e5e510",
  BLUE_FOREGROUND: "#2472c8",
  MAGENTA_FOREGROUND: "#bc3fbc",
  CYAN_FOREGROUND: "#11a8cd",
  WHITE_FOREGROUND: "#e5e5e5",

  // Bright foregrounds
  BRIGHT_BLACK_FOREGROUND: "#666666",
  BRIGHT_RED_FOREGROUND: "#f14c4c",
  BRIGHT_GREEN_FOREGROUND: "#23d18b",
  BRIGHT_YELLOW_FOREGROUND: "#f5f543",
  BRIGHT_BLUE_FOREGROUND: "#3b8eea",
  BRIGHT_MAGENTA_FOREGROUND: "#d670d6",
  BRIGHT_CYAN_FOREGROUND: "#29b8db",
  BRIGHT_WHITE_FOREGROUND: "#ffffff",

  // More foregrounds (were 256-color palette entries)
  ORANGE_FOREGROUND: "#ff8700",
  PINK_FOREGROUND: "#ff5faf",
  PURPLE_FOREGROUND: "#af87ff",
  LIME_FOREGROUND: "#87ff00",
  TEAL_FOREGROUND: "#5fd7d7",
  SKY_BLUE_FOREGROUND: "#87d7ff",
  GOLD_FOREGROUND: "#ffd700",
  GRAY_FOREGROUND: "#8a8a8a",
  DARK_GRAY_FOREGROUND: "#585858",

  // More backgrounds (were 256-color palette entries)
  ORANGE_BACKGROUND: "#ff8700",
  PINK_BACKGROUND: "#ff5faf",
  PURPLE_BACKGROUND: "#af87ff",
  LIME_BACKGROUND: "#87ff00",
  TEAL_BACKGROUND: "#5fd7d7",
  SKY_BLUE_BACKGROUND: "#87d7ff",
  GOLD_BACKGROUND: "#ffd700",
  GRAY_BACKGROUND: "#8a8a8a",
  DARK_GRAY_BACKGROUND: "#585858",

  FOREGROUND_OFF: "initial",
  BACKGROUND_OFF: "transparent",
  toTerminal: toTerminal,
  isHex: isHex,
  parseHex: parseHex,
  clearTerminalCache,
  terminalCacheSize,
  TERMINAL_CACHE_LIMIT,
};

// one Map per layer, so a lookup needs no key built from color + layer
const backgroundCache = new Map<string, string>();
const foregroundCache = new Map<string, string>();

function getCacheColor(color: string, background: boolean) {
  return (background ? backgroundCache : foregroundCache).get(color);
}
function setTerminalColor(color: string, background: boolean, output: string) {
  if (terminalCacheSize() < TERMINAL_CACHE_LIMIT) {
    (background ? backgroundCache : foregroundCache).set(color, output);
  }
  return output;
}

function toTerminal(color: string, background: boolean): string {
  if (color === "transparent") {
    return BACKGROUND_OFF;
  } else if (color === "initial") {
    return FOREGROUND_OFF;
  }
  if (!isHex(color)) {
    return color;
  }

  const terminalColor = getCacheColor(color, background);
  if (terminalColor) {
    return terminalColor;
  }

  const layer = background ? 48 : 38;
  const rgb = parseHex(color);

  if (!rgb) return color;

  const output = `\x1b[${layer};2;${rgb.r};${rgb.g};${rgb.b}m`;

  setTerminalColor(color, background, output);
  return output;
}
function isHex(color: string) {
  return color.charCodeAt(0) === HASH && (color.length - 1) % 3 === 0;
}

function hexDigit(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  code |= 0x20;
  if (code >= 97 && code <= 102) return code - 87;

  return -1;
}

// "#rrggbb" or "#rgb" only: a terminal cell has no alpha, so "#rgba" and
// "#rrggbbaa" are null here
function parseHex(color: string): ColorOptions | null {
  const length = color.length;
  if (length !== 4 && length !== 7) return null;
  return parseHexColor(color);
}

// any CSS color, as r/g/b 0-255 and a 0-1; null for anything else
export function parseColor(color: string): ColorOptions | null {
  return parseHexColor(color);
}

// "#rgb", "#rgba", "#rrggbb" or "#rrggbbaa", any case; null for anything else
function parseHexColor(color: string): ColorOptions | null {
  const length = color.length;
  if (color.charCodeAt(0) !== HASH) return null;

  // #rgb / #rgba: each digit doubled, "f" -> "ff" is 15 * 17
  if (length === 4 || length === 5) {
    const r = hexDigit(color.charCodeAt(1));
    const g = hexDigit(color.charCodeAt(2));
    const b = hexDigit(color.charCodeAt(3));
    const a = length === 5 ? hexDigit(color.charCodeAt(4)) : 15;
    if ((r | g | b | a) < 0) return null;
    return ColorOptions.Create(r * 17, g * 17, b * 17, (a * 17) / 255);
  }
  if (length !== 7 && length !== 9) return null;

  // index 0 is the #, then RRGGBB, then AA if there is one
  const redHigh = hexDigit(color.charCodeAt(1));
  const redLow = hexDigit(color.charCodeAt(2));
  const greenHigh = hexDigit(color.charCodeAt(3));
  const greenLow = hexDigit(color.charCodeAt(4));
  const blueHigh = hexDigit(color.charCodeAt(5));
  const blueLow = hexDigit(color.charCodeAt(6));
  const alphaHigh = length === 9 ? hexDigit(color.charCodeAt(7)) : 15;
  const alphaLow = length === 9 ? hexDigit(color.charCodeAt(8)) : 15;

  // any -1 (a character that isn't a hex digit) makes this negative
  if (
    (redHigh | redLow | greenHigh | greenLow | blueHigh | blueLow |
      alphaHigh | alphaLow) < 0
  ) {
    return null;
  }
  return ColorOptions.Create(
    redHigh * 16 + redLow,
    greenHigh * 16 + greenLow,
    blueHigh * 16 + blueLow,
    (alphaHigh * 16 + alphaLow) / 255,
  );
}

function clearTerminalCache() {
  backgroundCache.clear();
  foregroundCache.clear();
}

function terminalCacheSize() {
  return backgroundCache.size + foregroundCache.size;
}

export function blendColors() {}
export function formatColor() {}
export function mixColors() {}
