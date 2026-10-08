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

const words = (text: string, command: string) => code(text).run(command).lines()[0];

describe("upper and lower case", () => {
  it("uppercases the selection", () => {
    expect(exec("«hello» world", "editor.action.transformToUppercase")).eq("«HELLO» world");
  });

  it("lowercases the selection", () => {
    expect(exec("«HELLO» world", "editor.action.transformToLowercase")).eq("«hello» world");
  });

  it("uses the word under the cursor when nothing is selected", () => {
    expect(exec("he|llo world", "editor.action.transformToUppercase")).eq("HE|LLO world");
  });

  it("transforms every selection", () => {
    expect(exec("«ab» x «cd»", "editor.action.transformToUppercase")).eq("«AB» x «CD»");
  });
});

describe("title case", () => {
  it("capitalizes each word", () => {
    expect(words("«hello world»", "editor.action.transformToTitlecase")).eq("Hello World");
  });

  it("lowercases the rest of each word", () => {
    expect(words("«hELLO wORLD»", "editor.action.transformToTitlecase")).eq("Hello World");
  });

  it("does not capitalize after an apostrophe", () => {
    expect(words("«don't stop»", "editor.action.transformToTitlecase")).eq("Don't Stop");
  });
});

describe("programming cases", () => {
  it("snake case splits camelCase", () => {
    expect(words("«fooBarBaz»", "editor.action.transformToSnakecase")).eq("foo_bar_baz");
  });

  it("snake case keeps acronyms together", () => {
    expect(words("«parseHTMLString»", "editor.action.transformToSnakecase")).eq(
      "parse_html_string",
    );
  });

  it("kebab case", () => {
    expect(words("«fooBarBaz»", "editor.action.transformToKebabcase")).eq("foo-bar-baz");
  });

  it("camel case joins words on _ - and spaces", () => {
    expect(words("«foo_bar»", "editor.action.transformToCamelcase")).eq("fooBar");
    expect(words("«foo bar baz»", "editor.action.transformToCamelcase")).eq("fooBarBaz");
  });

  it("pascal case", () => {
    expect(words("«foo_bar»", "editor.action.transformToPascalcase")).eq("FooBar");
  });
});

describe("in-place replace", () => {
  it("swaps true and false", () => {
    expect(words("x = |true", "editor.action.inPlaceReplace.down")).eq("x = false");
  });

  it("goes through public, protected, private", () => {
    expect(words("|public x", "editor.action.inPlaceReplace.down")).eq("private x");
    expect(words("|public x", "editor.action.inPlaceReplace.up")).eq("protected x");
  });

  it("up adds one to a number", () => {
    expect(words("x = |5", "editor.action.inPlaceReplace.up")).eq("x = 6");
  });

  it("down subtracts one", () => {
    expect(words("x = |5", "editor.action.inPlaceReplace.down")).eq("x = 4");
  });

  it("steps by the last decimal place", () => {
    expect(words("x = |1.5", "editor.action.inPlaceReplace.up")).eq("x = 1.6");
  });
});
