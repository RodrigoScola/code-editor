import { ColorOptions } from "../colorOptions.js";
import { ColorParser } from "./ColorParser.js";

export class RgbParser {
  static Valid(color: string) {
    color = color.trim();
    return (
      color.startsWith("rgb") && color.indexOf(`(`) > -1 && color.endsWith(")")
    );
  }
  static FromString(code: string): ColorOptions | null {
    const colorLocations: string[] = RgbParser.GetParts(code);

    const opts = ColorOptions.Create().setType("rgb");

    const red = colorLocations.at(0);
    const green = colorLocations.at(1);

    const blue = colorLocations.at(2);
    const alpha = colorLocations.at(3);

    red && opts.setRed(ColorParser.Channel(red));
    green && opts.setGreen(ColorParser.Channel(green));
    blue && opts.setBlue(ColorParser.Channel(blue));
    alpha && opts.setAlpha(ColorParser.Alpha(alpha));

    return opts;
  }
  // "rgb(36, 114, 200)"; with a see-through alpha "rgba(36, 114, 200, 0.5)",
  // which FromString reads back
  static ToRgb(color: ColorOptions): string {
    const rgb = `${color.r}, ${color.g}, ${color.b}`;
    return color.a < 1 ? `rgba(${rgb}, ${alpha3(color.a)})` : `rgb(${rgb})`;
  }
  private static GetParts(code: string) {
    const inside = code.slice(code.indexOf("(") + 1, code.lastIndexOf(")"));
    const [channelText, alphaText] = inside.split("/");
    const parts = channelText
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((color) => color.trim());
    if (alphaText !== undefined) parts.push(alphaText.trim());

    return parts;
  }
}

// 0-1 with at most 3 decimals: 0.5 -> "0.5", 1/3 -> "0.333"
const alpha3 = (a: number) => String(Number(a.toFixed(3)));
