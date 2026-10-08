import { describe, expect, it } from "vitest";
import { copyAsJson, parseSettingsUrl, searchSettings } from "../../../src/Settings/settingsSearch.js";

// The Settings editor's search box. Proposed src/Settings/settingsSearch.ts:
//   searchSettings(settings, query, { modified: Set<id>, languages? })
//     settings: [{ id, title, description, feature, tags?, languageOverridable? }]
//     every plain word has to appear in the id, title or description
//     @modified       only settings changed from their default
//     @id:<id>        exactly that setting
//     @lang:<id>      only language-overridable settings
//     @tag:<tag>      by tag; settings tagged "advanced" are hidden unless
//                     this asks for them
//     @feature:<name> by feature area (explorer, terminal, ...)
//     filters and words combine
//   parseSettingsUrl("vscode://settings/editor.tabSize") -> "editor.tabSize"
//   copyAsJson(id, value) -> '"editor.tabSize": 4'

const settings = [
  { id: "editor.tabSize", title: "Tab Size", description: "The number of spaces a tab is equal to.", feature: "editor", languageOverridable: true },
  { id: "editor.insertSpaces", title: "Insert Spaces", description: "Insert spaces when pressing Tab.", feature: "editor", languageOverridable: true },
  { id: "explorer.compactFolders", title: "Compact Folders", description: "Render single child folders in a compact form.", feature: "explorer" },
  { id: "terminal.integrated.gpuAcceleration", title: "Gpu Acceleration", description: "Use the GPU to render.", feature: "terminal", tags: ["advanced"] },
  { id: "editor.experimentalThing", title: "Experimental Thing", description: "Try it.", feature: "editor", tags: ["experimental"] },
];

const ids = (results: { id: string }[]) => results.map((s) => s.id);
const search = (query: string, modified: string[] = []) => ids(searchSettings(settings, query, { modified: new Set(modified) }));

describe("searchSettings", () => {
  it("matches words in the id, title or description", () => {
    expect(search("tab size")).toEqual(["editor.tabSize"]);
    expect(search("compact")).toEqual(["explorer.compactFolders"]);
  });

  it("every word has to match", () => {
    expect(search("tab folders")).toEqual([]);
  });

  it("@modified", () => {
    expect(search("@modified", ["editor.insertSpaces"])).toEqual(["editor.insertSpaces"]);
  });

  it("@id: matches exactly", () => {
    expect(search("@id:editor.tabSize")).toEqual(["editor.tabSize"]);
  });

  it("@lang: shows language-overridable settings", () => {
    expect(search("@lang:typescript")).toEqual(["editor.tabSize", "editor.insertSpaces"]);
  });

  it("@feature:", () => {
    expect(search("@feature:explorer")).toEqual(["explorer.compactFolders"]);
  });

  it("hides advanced settings unless @tag:advanced asks", () => {
    expect(search("gpu")).toEqual([]);
    expect(search("@tag:advanced")).toEqual(["terminal.integrated.gpuAcceleration"]);
  });

  it("@tag: other tags", () => {
    expect(search("@tag:experimental")).toEqual(["editor.experimentalThing"]);
  });

  it("filters and words combine", () => {
    expect(search("@feature:editor spaces")).toEqual(["editor.tabSize", "editor.insertSpaces"]);
  });
});

describe("helpers", () => {
  it("parseSettingsUrl", () => {
    expect(parseSettingsUrl("vscode://settings/editor.tabSize")).eq("editor.tabSize");
    expect(parseSettingsUrl("https://example.com")).toBeUndefined();
  });

  it("copyAsJson", () => {
    expect(copyAsJson("editor.tabSize", 4)).eq('"editor.tabSize": 4');
    expect(copyAsJson("editor.rulers", [80, 100])).eq('"editor.rulers": [80, 100]');
  });
});
