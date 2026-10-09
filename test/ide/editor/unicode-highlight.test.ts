import { describe, expect, it } from "vitest";
import { findUnicodeHighlights } from "../../../src/Editor/decorations/unicodeHighlight.js";

// Proposed module src/Editor/decorations/unicodeHighlight.ts
// (editor.unicodeHighlight.*): find characters that are easy to miss or to
// mistake, a common way to hide something in code.
//
//   findUnicodeHighlights(lines, options?) -> [{ line, column, char, reason,
//     confusableWith? }]
//   reason: "invisible"       zero width and other invisible characters
//           "ambiguous"       looks like a common ASCII character
//                             (Cyrillic а vs Latin a)
//           "nonBasicAscii"   anything outside basic ASCII (off by default)
//   options: { invisibleCharacters = true, ambiguousCharacters = true,
//              nonBasicASCII = false, allowedCharacters = {},
//              allowedLocales = {} }

describe("invisible characters", () => {
  it("finds a zero width space", () => {
    expect(findUnicodeHighlights(["a​b"])).toEqual([
      { line: 0, column: 1, char: "​", reason: "invisible" },
    ]);
  });

  it("leaves normal spaces and tabs alone", () => {
    expect(findUnicodeHighlights(["a b\tc"])).toEqual([]);
  });

  it("can be turned off", () => {
    expect(findUnicodeHighlights(["a​b"], { invisibleCharacters: false })).toEqual([]);
  });
});

describe("ambiguous characters", () => {
  it("finds a Cyrillic a that looks like a Latin a", () => {
    expect(findUnicodeHighlights(["vаr"])).toEqual([
      { line: 0, column: 1, char: "а", reason: "ambiguous", confusableWith: "a" },
    ]);
  });

  it("allowedCharacters skips characters you allow", () => {
    expect(findUnicodeHighlights(["vаr"], { allowedCharacters: { "а": true } })).toEqual(
      [],
    );
  });

  it("allowedLocales skips characters that are normal in that language", () => {
    expect(findUnicodeHighlights(["привет"], { allowedLocales: { ru: true } })).toEqual([]);
  });

  it("can be turned off", () => {
    expect(findUnicodeHighlights(["vаr"], { ambiguousCharacters: false })).toEqual([]);
  });
});

describe("non-basic ASCII", () => {
  it("is off by default", () => {
    expect(findUnicodeHighlights(["café"])).toEqual([]);
  });

  it("finds every character outside basic ASCII when on", () => {
    expect(findUnicodeHighlights(["café"], { nonBasicASCII: true })).toEqual([
      { line: 0, column: 3, char: "é", reason: "nonBasicAscii" },
    ]);
  });
});
