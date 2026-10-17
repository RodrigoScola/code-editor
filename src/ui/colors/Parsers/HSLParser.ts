import { ColorOptions } from "../colorOptions.js";
import { ColorParser } from "./ColorParser.js";

export class HslParser {
  static Valid(color: string) {
    color = color.trim();
    return (
      color.startsWith("hsl") && color.indexOf(`(`) > -1 && color.endsWith(")")
    );
  }
  static FromString(color: string): ColorOptions | null {
    const [hue, saturation, lightness, alpha] = ColorParser.GetParts(color);
    if (!hue || !saturation || !lightness) return null;

    // hue in degrees, wrapped to 0-360 ("120deg" works, parseFloat drops the unit)
    const h = ((parseFloat(hue) % 360) + 360) % 360;
    // saturation and lightness are percents, as 0-1
    const s = Math.min(1, Math.max(0, parseFloat(saturation) / 100));
    const l = Math.min(1, Math.max(0, parseFloat(lightness) / 100));

    // the CSS spec's hsl -> rgb: n is 0 for red, 8 for green, 4 for blue
    const a = s * Math.min(l, 1 - l);
    const channel = (n: number) => {
      const k = (n + h / 30) % 12;
      return Math.round(
        255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
      );
    };

    const opts = ColorOptions.Create(
      channel(0),
      channel(8),
      channel(4),
    ).setType("hsl");
    alpha && opts.setAlpha(ColorParser.Alpha(alpha));

    return opts;
  }
  static GetParts(code: string) {
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
