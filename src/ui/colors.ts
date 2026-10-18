export default {
  RED: "#cd3131",
  GREEN: "#0dbc79",
  YELLOW: "#e5e510",
  BLUE: "#2472c8",
  MAGENTA: "#bc3fbc",
  CYAN: "#11a8cd",
  WHITE: "#e5e5e5",
  BLACK: "#000000",

  BRIGHT_RED: "#f14c4c",
  BRIGHT_GREEN: "#23d18b",
  BRIGHT_YELLOW: "#f5f543",
  BRIGHT_BLUE: "#3b8eea",
  BRIGHT_MAGENTA: "#d670d6",
  BRIGHT_CYAN: "#29b8db",
  BRIGHT_WHITE: "#ffffff",

  // More foregrounds (were 256-color palette entries)
  ORANGE: "#ff8700",
  PINK: "#ff5faf",
  PURPLE: "#af87ff",
  LIME: "#87ff00",
  TEAL: "#5fd7d7",
  GOLD: "#ffd700",
  GRAY: "#8a8a8a",
  DARK_GRAY: "#585858",

  SKY_BLUE: "#87d7ff",

  FOREGROUND_OFF: "initial",
  BACKGROUND_OFF: "transparent",
};

export const DEFAULT_BACKGROUND = "#1e1e1e";
export const DEFAULT_FOREGROUND = "#d4d4d4";

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
