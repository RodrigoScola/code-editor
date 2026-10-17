import { ColorParser } from "./colors/Parsers/ColorParser.js";

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
};

// top painted over under ("source over"), as "#rrggbb[aa]"
export function blendColors(top: string, under: string): string {
  throw new Error("not implemented");
}

// "#rrggbb", or "#rrggbbaa" when not opaque; channels rounded
export function formatColor(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  throw new Error("not implemented");
}

// the color t of the way from a to b, alpha premultiplied; throws for
// something that isn't a CSS color
export function mixColors(a: string, b: string, t: number): string {
  throw new Error("not implemented");
}
