import { describe, expect, it } from "vitest";
import { evaluateWhen, parseWhen } from "../../../src/Keybindings/whenClause.js";

// when clauses (keybindings, menus, views). Proposed
// src/Keybindings/whenClause.ts:
//   parseWhen(text) -> an expression; throws on a syntax error
//   evaluateWhen(textOrExpression, context) -> boolean
// From the VS Code docs (when clause contexts):
//   !  &&  ||  with ! binding tightest, then &&, then ||; ( ) to group
//   ==  !=  (=== and !== mean the same) compare with a literal on the right;
//     a literal with spaces goes in single quotes
//   >  >=  <  <=  compare numbers and need spaces around them
//   =~  matches a /regex/ with flags i s m u (g and y are ignored)
//   in / not in: is the key's value in another key's array (or one of an
//     object's keys)
//   a bare key is true when its value is truthy; true and false are literals

const ctx = {
  editorTextFocus: true,
  editorReadonly: false,
  inDebugMode: false,
  editorLangId: "typescript",
  resourceExtname: ".ts",
  resourceFilename: "My New File.md",
  resourceScheme: "file",
  workspaceFolderCount: 1,
  supportedFolders: ["src", "test"],
  folderMap: { src: true },
  "config.editor.minimap.enabled": true,
  emptyString: "",
};

const when = (text: string) => evaluateWhen(text, ctx);

describe("keys and logic", () => {
  it("a bare key is its truthiness", () => {
    expect(when("editorTextFocus")).eq(true);
    expect(when("editorReadonly")).eq(false);
    expect(when("notSet")).eq(false);
    expect(when("emptyString")).eq(false);
  });

  it("! negates", () => {
    expect(when("!editorReadonly")).eq(true);
  });

  it("&& and ||", () => {
    expect(when("editorTextFocus && !editorReadonly")).eq(true);
    expect(when("inDebugMode || editorReadonly")).eq(false);
  });

  it("&& binds tighter than ||", () => {
    // true || (false && false)
    expect(when("editorTextFocus || inDebugMode && editorReadonly")).eq(true);
    // (false && x) || false
    expect(when("inDebugMode && editorTextFocus || editorReadonly")).eq(false);
  });

  it("parentheses group", () => {
    expect(when("!(editorReadonly || inDebugMode)")).eq(true);
    expect(when("(editorTextFocus || inDebugMode) && editorReadonly")).eq(false);
  });

  it("true and false are literals", () => {
    expect(when("true")).eq(true);
    expect(when("false || editorTextFocus")).eq(true);
  });

  it("config keys", () => {
    expect(when("config.editor.minimap.enabled")).eq(true);
  });
});

describe("comparisons", () => {
  it("== and != with a literal", () => {
    expect(when("editorLangId == typescript")).eq(true);
    expect(when("resourceExtname != .js")).eq(true);
  });

  it("=== and !== are the same as == and !=", () => {
    expect(when("editorLangId === typescript")).eq(true);
    expect(when("editorLangId !== typescript")).eq(false);
  });

  it("a quoted literal can contain spaces", () => {
    expect(when("resourceFilename == 'My New File.md'")).eq(true);
  });

  it("numbers", () => {
    expect(when("workspaceFolderCount < 2")).eq(true);
    expect(when("workspaceFolderCount >= 1")).eq(true);
    expect(when("workspaceFolderCount > 1")).eq(false);
  });

  it("needs spaces around < and >", () => {
    expect(() => parseWhen("workspaceFolderCount<2")).toThrow();
  });
});

describe("regex", () => {
  it("matches the key's value", () => {
    expect(when("resourceScheme =~ /^untitled$|^file$/")).eq(true);
  });

  it("takes flags", () => {
    expect(when("editorLangId =~ /TYPESCRIPT/i")).eq(true);
    expect(when("editorLangId =~ /TYPESCRIPT/")).eq(false);
  });

  it("escaped slashes are part of the pattern", () => {
    expect(evaluateWhen("resource =~ /file:\\/\\//", { resource: "file:///p/a.ts" })).eq(true);
  });

  it("is negated with ! and parentheses", () => {
    expect(when("!(resourceScheme =~ /^untitled$/)")).eq(true);
  });
});

describe("in and not in", () => {
  it("checks an array", () => {
    expect(evaluateWhen("name in supportedFolders", { ...ctx, name: "src" })).eq(true);
    expect(evaluateWhen("name in supportedFolders", { ...ctx, name: "docs" })).eq(false);
  });

  it("checks an object's keys", () => {
    expect(evaluateWhen("name in folderMap", { ...ctx, name: "src" })).eq(true);
  });

  it("not in", () => {
    expect(evaluateWhen("name not in supportedFolders", { ...ctx, name: "docs" })).eq(true);
  });
});

describe("parse errors", () => {
  it("throws on unbalanced parentheses", () => {
    expect(() => parseWhen("(a && b")).toThrow();
  });

  it("throws on a dangling operator", () => {
    expect(() => parseWhen("a &&")).toThrow();
  });
});
