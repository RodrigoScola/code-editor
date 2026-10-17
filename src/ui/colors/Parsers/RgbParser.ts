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
