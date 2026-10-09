import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Transform commands (Command Palette "Transform to ..."). With nothing
// selected they act on the word under the cursor.
//   editor.action.transformToUppercase / Lowercase / Titlecase
//   editor.action.transformToSnakecase / Kebabcase / Camelcase / Pascalcase
//
// In-place replace (Ctrl+Shift+, and Ctrl+Shift+.) steps the value under
// the cursor through a set: true/false, True/False, public/protected/private,
// or a number up and down by its last digit.
//   editor.action.inPlaceReplace.up / editor.action.inPlaceReplace.down

const words = (text: string, command: string) => code(text).executeCommand(command).lines()[0];

describe("upper and lower case", () => {
  it("uppercases the selection", () => {
    expect(exec("«hello» world", "textEditor.transformToUpperCase")).eq("«HELLO» world");
  });

  it("lowercases the selection", () => {
    expect(exec("«HELLO» world", "textEditor.transformToLowerCase")).eq("«hello» world");
  });

  it("uses the word under the cursor when nothing is selected", () => {
    expect(exec("he|llo world", "textEditor.transformToUpperCase")).eq("HE|LLO world");
  });

  it("transforms every selection", () => {
    expect(exec("«ab» x «cd»", "textEditor.transformToUpperCase")).eq("«AB» x «CD»");
  });
});

describe("title case", () => {
  it("capitalizes each word", () => {
    expect(words("«hello world»", "textEditor.transformToTitleCase")).eq("Hello World");
  });

  it("lowercases the rest of each word", () => {
    expect(words("«hELLO wORLD»", "textEditor.transformToTitleCase")).eq("Hello World");
  });

  it("does not capitalize after an apostrophe", () => {
    expect(words("«don't stop»", "textEditor.transformToTitleCase")).eq("Don't Stop");
  });
});

describe("programming cases", () => {
  it("snake case splits camelCase", () => {
    expect(words("«fooBarBaz»", "textEditor.transformToSnakeCase")).eq("foo_bar_baz");
  });

  it("snake case keeps acronyms together", () => {
    expect(words("«parseHTMLString»", "textEditor.transformToSnakeCase")).eq(
      "parse_html_string",
    );
  });

  it("kebab case", () => {
    expect(words("«fooBarBaz»", "textEditor.transformToKebabCase")).eq("foo-bar-baz");
  });

  it("camel case joins words on _ - and spaces", () => {
    expect(words("«foo_bar»", "textEditor.transformToCamelCase")).eq("fooBar");
    expect(words("«foo bar baz»", "textEditor.transformToCamelCase")).eq("fooBarBaz");
  });

  it("pascal case", () => {
    expect(words("«foo_bar»", "textEditor.transformToPascalCase")).eq("FooBar");
  });
});

describe("in-place replace", () => {
  it("swaps true and false", () => {
    expect(words("x = |true", "textEditor.inPlaceReplaceDown")).eq("x = false");
  });

  it("goes through public, protected, private", () => {
    expect(words("|public x", "textEditor.inPlaceReplaceDown")).eq("private x");
    expect(words("|public x", "textEditor.inPlaceReplaceUp")).eq("protected x");
  });

  it("up adds one to a number", () => {
    expect(words("x = |5", "textEditor.inPlaceReplaceUp")).eq("x = 6");
  });

  it("down subtracts one", () => {
    expect(words("x = |5", "textEditor.inPlaceReplaceDown")).eq("x = 4");
  });

  it("steps by the last decimal place", () => {
    expect(words("x = |1.5", "textEditor.inPlaceReplaceUp")).eq("x = 1.6");
  });
});
