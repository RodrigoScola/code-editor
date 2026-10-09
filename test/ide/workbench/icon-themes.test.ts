import { describe, expect, it } from "vitest";
import { iconGlyph, loadIconTheme } from "../../../src/Themes/iconTheme.js";

// File icon themes (VS Code: workbench.iconTheme), for the file tree, tabs
// and quick open. In a terminal the icons are font characters (a Nerd Font
// or a theme's own font), so a definition is a character and a color.
//
// Proposed src/Themes/iconTheme.ts:
//   loadIconTheme(json) -> theme
//   theme.iconFor(path, { folder?, expanded?, root?, languageId?,
//     kind?: "dark" | "light" | "highContrast" }) -> definition id or undefined
//   iconGlyph(theme, id) -> { character, color? } from iconDefinitions
//     (fontCharacter "\\E001" is the character U+E001)
//
// Which icon a file gets, first match wins:
//   fileNames (the whole name, any case) > fileExtensions (the longest:
//   "d.ts" before "ts") > languageIds > file
// Folders: folderNamesExpanded (when open) > folderNames > rootFolderExpanded
// / rootFolder (for workspace roots) > folderExpanded > folder
// "light" and "highContrast" sections replace entries for those kinds;
// what they don't have comes from the main sections.

const theme = loadIconTheme({
  iconDefinitions: {
    file: { fontCharacter: "\\E001" },
    folder: { fontCharacter: "\\E002", fontColor: "#c09553" },
    folderOpen: { fontCharacter: "\\E003" },
    root: { fontCharacter: "\\E004" },
    ts: { fontCharacter: "\\E010", fontColor: "#3178c6" },
    dts: { fontCharacter: "\\E011" },
    json: { fontCharacter: "\\E012" },
    pkg: { fontCharacter: "\\E013" },
    md: { fontCharacter: "\\E014" },
    src: { fontCharacter: "\\E020" },
    srcOpen: { fontCharacter: "\\E021" },
    tsLight: { fontCharacter: "\\E030" },
  },
  file: "file",
  folder: "folder",
  folderExpanded: "folderOpen",
  rootFolder: "root",
  fileExtensions: { ts: "ts", "d.ts": "dts", json: "json" },
  fileNames: { "package.json": "pkg" },
  languageIds: { markdown: "md" },
  folderNames: { src: "src" },
  folderNamesExpanded: { src: "srcOpen" },
  light: { fileExtensions: { ts: "tsLight" } },
});

describe("files", () => {
  it("uses the extension", () => {
    expect(theme.iconFor("/a/b.ts")).eq("ts");
  });

  it("prefers the longest extension", () => {
    expect(theme.iconFor("/a/types.d.ts")).eq("dts");
  });

  it("an exact file name beats the extension", () => {
    expect(theme.iconFor("/a/package.json")).eq("pkg");
  });

  it("ignores case", () => {
    expect(theme.iconFor("/a/PACKAGE.JSON")).eq("pkg");
    expect(theme.iconFor("/a/B.TS")).eq("ts");
  });

  it("falls back to the language", () => {
    expect(theme.iconFor("/a/README.markdown", { languageId: "markdown" })).eq("md");
  });

  it("the extension beats the language", () => {
    expect(theme.iconFor("/a/b.ts", { languageId: "markdown" })).eq("ts");
  });

  it("falls back to the default file icon", () => {
    expect(theme.iconFor("/a/notes.xyz")).eq("file");
  });

  it("a dot file is a name, not an extension", () => {
    const t = loadIconTheme({
      iconDefinitions: { file: {}, ignore: {}, env: {} },
      file: "file",
      fileNames: { ".gitignore": "ignore" },
      fileExtensions: { env: "env" },
    });

    expect(t.iconFor("/a/.gitignore")).eq("ignore");
    expect(t.iconFor("/a/.env")).eq("env");
  });

  it("works with Windows paths", () => {
    expect(theme.iconFor("C:\\a\\package.json")).eq("pkg");
  });
});

describe("folders", () => {
  it("closed and open", () => {
    expect(theme.iconFor("/a/lib", { folder: true })).eq("folder");
    expect(theme.iconFor("/a/lib", { folder: true, expanded: true })).eq("folderOpen");
  });

  it("by name", () => {
    expect(theme.iconFor("/a/src", { folder: true })).eq("src");
    expect(theme.iconFor("/a/src", { folder: true, expanded: true })).eq("srcOpen");
  });

  it("an open folder without its own open icon uses its closed name icon", () => {
    const t = loadIconTheme({
      iconDefinitions: { folder: {}, open: {}, test: {} },
      folder: "folder",
      folderExpanded: "open",
      folderNames: { test: "test" },
    });

    expect(t.iconFor("/a/test", { folder: true, expanded: true })).eq("test");
  });

  it("a workspace root uses rootFolder", () => {
    expect(theme.iconFor("/work/app", { folder: true, root: true })).eq("root");
  });

  it("a root without rootFolderExpanded uses rootFolder when open", () => {
    expect(theme.iconFor("/work/app", { folder: true, root: true, expanded: true })).eq("root");
  });

  it("folder name icons don't apply to files", () => {
    expect(theme.iconFor("/a/src")).eq("file");
  });
});

describe("light and high contrast", () => {
  it("the light section replaces entries for light themes", () => {
    expect(theme.iconFor("/a/b.ts", { kind: "light" })).eq("tsLight");
  });

  it("what the light section lacks comes from the main sections", () => {
    expect(theme.iconFor("/a/package.json", { kind: "light" })).eq("pkg");
    expect(theme.iconFor("/a/lib", { folder: true, kind: "light" })).eq("folder");
  });

  it("dark themes ignore the light section", () => {
    expect(theme.iconFor("/a/b.ts", { kind: "dark" })).eq("ts");
  });

  it("high contrast uses its own section, not the light one", () => {
    expect(theme.iconFor("/a/b.ts", { kind: "highContrast" })).eq("ts");
  });
});

describe("glyphs", () => {
  it("turns fontCharacter into the character", () => {
    expect(iconGlyph(theme, "ts")).toEqual({ character: "\uE010", color: "#3178c6" });
  });

  it("has no color when the definition sets none", () => {
    expect(iconGlyph(theme, "file")).toEqual({ character: "\uE001" });
  });

  it("returns undefined for a definition that doesn't exist", () => {
    expect(iconGlyph(theme, "nope")).eq(undefined);
  });

  it("a theme without a default file icon gives undefined, so the tree draws none", () => {
    const t = loadIconTheme({ iconDefinitions: {} });

    expect(t.iconFor("/a/b.ts")).eq(undefined);
  });
});
