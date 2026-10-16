// Color themes (workbench.colorTheme, workbench.colorCustomizations,
// editor.tokenColorCustomizations, editor.semanticTokenColorCustomizations)

export interface TokenStyle {
  foreground?: string;
  background?: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

export interface TextMateRule {
  // a comma list or an array; none sets the defaults
  scope?: string | string[];
  settings: { foreground?: string; background?: string; fontStyle?: string };
}

export interface ThemeCustomizations {
  // id -> color, or "[Theme Name]" -> { id -> color }
  colors?: Record<string, string | Record<string, string>>;
  tokenColors?: {
    comments?: string;
    strings?: string;
    numbers?: string;
    keywords?: string;
    types?: string;
    functions?: string;
    variables?: string;
    textMateRules?: TextMateRule[];
  };
  semanticTokenColors?: Record<string, unknown>;
}

export interface ColorTheme {
  name: string;
  type: "dark" | "light" | "hc";
  // "#rrggbb" or "#rrggbbaa", lowercase
  color(id: string): string | undefined;
  // the TextMate scope stack, outermost first
  tokenStyle(scopes: string[]): TokenStyle;
  // undefined when the theme turns semantic highlighting off
  semanticStyle(type: string, modifiers: string[], language: string): TokenStyle | undefined;
}

// text is the theme file (JSON with comments); "include" loads another
// theme first through readInclude
export function loadColorTheme(
  text: string,
  options: { readInclude?(path: string): string; customizations?: ThemeCustomizations } = {},
): ColorTheme {
  throw new Error("not implemented");
}

// "256" picks the nearest of the 6x6x6 cube and the 24 grays; "16" the
// nearest of xterm's default 16 colors; alpha is ignored
export function ansiColor(
  hex: string,
  depth: "truecolor" | "256" | "16",
  layer: "foreground" | "background" = "foreground",
): string {
  throw new Error("not implemented");
}
