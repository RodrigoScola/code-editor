import { ColorOptions } from "../colorOptions.js";

const HASH = 35; // "#"
export class HexParser {
  static Valid(color: string) {
    return color.charCodeAt(0) === HASH;
  }
  static FromString(color: string): ColorOptions | null {
    const length = color.length;
    if (color.charCodeAt(0) !== HASH) return null;

    // #rgb / #rgba: each digit doubled, "f" -> "ff" is 15 * 17
    if (length === 4 || length === 5) {
      const r = hexDigit(color.charCodeAt(1));
      const g = hexDigit(color.charCodeAt(2));
      const b = hexDigit(color.charCodeAt(3));
      const a = length === 5 ? hexDigit(color.charCodeAt(4)) : 15;
      if ((r | g | b | a) < 0) return null;
      return ColorOptions.Create(
        r * 17,
        g * 17,
        b * 17,
        (a * 17) / 255,
      ).setType("hex");
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
      (redHigh |
        redLow |
        greenHigh |
        greenLow |
        blueHigh |
        blueLow |
        alphaHigh |
        alphaLow) <
      0
    ) {
      return null;
    }
    return ColorOptions.Create(
      redHigh * 16 + redLow,
      greenHigh * 16 + greenLow,
      blueHigh * 16 + blueLow,
      (alphaHigh * 16 + alphaLow) / 255,
    ).setType("hex");
  }

  static hexDigit(code: number): number {
    if (code >= 48 && code <= 57) return code - 48;
    code |= 0x20;
    if (code >= 97 && code <= 102) return code - 87;

    return -1;
  }
  static ToHex(color: ColorOptions): string {
    return `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}`;
  }
}

// 0-255 as two hex digits: 5 -> "05", 200 -> "c8"
const hex2 = (n: number) => n.toString(16).padStart(2, "0");
const hexDigit = HexParser.hexDigit;
