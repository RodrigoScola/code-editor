// A style's color as a pixel's color. The palette is VS Code's dark
// terminal theme, the same one colors.ts uses.

import { AnsiParser } from "../colors/Parsers/AnsiParser.js";

export const DEFAULT_BACKGROUND = "#1e1e1e";
export const DEFAULT_FOREGROUND = "#d4d4d4";

// black red green yellow blue magenta cyan white, then the bright ones
export const BASIC_COLORS: string[] = [
  "#000000",
  "#cd3131",
  "#0dbc79",
  "#e5e510",
  "#2472c8",
  "#bc3fbc",
  "#11a8cd",
  "#e5e5e5",
  "#666666",
  "#f14c4c",
  "#23d18b",
  "#f5f543",
  "#3b8eea",
  "#d670d6",
  "#29b8db",
  "#ffffff",
];

// "#rrggbb" (lower case) for a CSS color or an ANSI color code; null for
// the default color ("transparent", "initial", ESC[39m, ESC[49m) and for
// anything that isn't a color
export function ansiToCss(code: string): string | null {
  throw new Error("not implemented");
}
