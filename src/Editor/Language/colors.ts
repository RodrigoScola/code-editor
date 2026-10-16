// Color decorators (editor.defaultColorDecorators), found in any file

export interface RgbaColor {
  // 0-255
  red: number;
  green: number;
  blue: number;
  // 0-1
  alpha: number;
}

export interface ColorMatch {
  line: number;
  start: number;
  end: number;
  color: RgbaColor;
}

// #rgb #rgba #rrggbb #rrggbbaa, rgb() rgba() hsl() hsla(), any case; at
// most limit of them (editor.colorDecoratorsLimit)
export function findColors(text: string, limit = 500): ColorMatch[] {
  throw new Error("not implemented");
}

// the ways to write it, for the color picker: hex, rgb(), hsl() (with
// alpha when it isn't 1)
export function colorPresentations(color: RgbaColor): string[] {
  throw new Error("not implemented");
}
