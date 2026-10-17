import assert from "assert";
import { ColorOptions } from "../colorOptions.js";
import { ColorNameParser } from "./ColorNameParser.js";
import { AnsiParser } from "./AnsiParser.js";
import { HexParser } from "./HexParser.js";
import { RgbParser } from "./RgbParser.js";
import { HslParser } from "./HSLParser.js";

export class ColorParser {
  static ValidHex(color: string) {
    return HexParser.Valid(color);
  }
  static ValidRgb(color: string) {
    return RgbParser.Valid(color);
  }
  static ValidAnsi(color: string) {
    return AnsiParser.Valid(color);
  }
  static ValidName(color: string) {
    return ColorNameParser.Valid(color);
  }
  static ValidHsl(color: string) {
    return HslParser.Valid(color);
  }
  static ToHex(color: string) {
    return HexParser.FromString(color);
  }
  static ToRgb(color: string) {
    return RgbParser.FromString(color);
  }
  static ToAnsi(color: string) {
    return AnsiParser.FromString(color);
  }
  static ToNamed(color: string) {
    return ColorNameParser.FromString(color);
  }
  static ToHsl(color: string) {
    return HslParser.FromString(color);
  }

  // only the cheap check: Hex() checks the length (#rgb, #rgba, #rrggbb,
  // #rrggbbaa) and every digit

  // hsl() converted to rgb, so r/g/b mean the same thing whatever the source

  // any CSS color, as r/g/b 0-255 and a 0-1; null for anything else
  static FromString(color: string): ColorOptions | null {
    if (RgbParser.Valid(color)) {
      return RgbParser.FromString(color);
    } else if (HslParser.Valid(color)) {
      const result = HslParser.FromString(color);
      assert(result?.type == "hsl", `invalid parsing type`);
      return result;
    } else if (HexParser.Valid(color)) {
      return HexParser.FromString(color);
    } else if (AnsiParser.Valid(color)) {
      return AnsiParser.FromString(color);
    } else if (ColorNameParser.Valid(color)) {
      return ColorNameParser.FromString(color);
    }

    return null;
  }

  // alpha: a number from 0 to 1, or a percent
  static Alpha(text: string): number {
    const value = text.endsWith("%")
      ? parseFloat(text) / 100
      : parseFloat(text);
    return Math.min(1, Math.max(0, value));
  }
  static Channel(text: string): number {
    const value = text.endsWith("%")
      ? (parseFloat(text) / 100) * 255
      : parseFloat(text);
    return Math.round(Math.min(255, Math.max(0, value)));
  }
}
