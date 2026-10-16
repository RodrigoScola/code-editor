// File icon themes (workbench.iconTheme). In a terminal the icons are font
// characters, so a definition is a character and a color.

export interface IconDefinition {
  // "\\E001" is the character U+E001
  fontCharacter?: string;
  fontColor?: string;
  fontId?: string;
  iconPath?: string;
}

export interface IconAssociations {
  file?: string;
  folder?: string;
  folderExpanded?: string;
  rootFolder?: string;
  rootFolderExpanded?: string;
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  languageIds?: Record<string, string>;
  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;
}

export interface IconThemeDocument extends IconAssociations {
  iconDefinitions: Record<string, IconDefinition>;
  // replace entries for those kinds
  light?: IconAssociations;
  highContrast?: IconAssociations;
}

export interface IconTheme {
  // a definition id, or undefined
  iconFor(
    path: string,
    options?: {
      folder?: boolean;
      expanded?: boolean;
      root?: boolean;
      languageId?: string;
      kind?: "dark" | "light" | "highContrast";
    },
  ): string | undefined;
}

export function loadIconTheme(document: IconThemeDocument): IconTheme {
  throw new Error("not implemented");
}

export function iconGlyph(theme: IconTheme, id: string): { character: string; color?: string } | undefined {
  throw new Error("not implemented");
}
