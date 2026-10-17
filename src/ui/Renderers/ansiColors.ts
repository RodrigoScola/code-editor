// A style's color as a pixel's color. The palette is VS Code's dark
// terminal theme, the same one colors.ts uses.

import colors from "../colors.js";
import { ColorParser } from "../colors/Parsers/ColorParser.js";

export const DEFAULT_BACKGROUND = "#1e1e1e";
export const DEFAULT_FOREGROUND = "#d4d4d4";

// black red green yellow blue magenta cyan white, then the bright ones

// "#rrggbb" (lower case) for a CSS color or an ANSI color code; null for
// the default color ("transparent", "initial", ESC[39m, ESC[49m) and for
// anything that isn't a color
export function ansiToCss(code: string): string | null {
  const color = ColorParser.FromString(code);
  return ColorParser.ToHex(color);
}
