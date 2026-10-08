import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Edge cases for transforms and in-place replace (base spec:
// case-transforms.test.ts).

const one = (text: string, command: string) => code(text).run(command).lines()[0];

describe("transforms", () => {
  it("upper case works for letters outside ASCII", () => {
    expect(one("«straße éa»", "editor.action.transformToUppercase")).eq("STRASSE ÉA");
  });

  it("title case keeps numbers", () => {
    expect(one("«2nd place»", "editor.action.transformToTitlecase")).eq("2nd Place");
  });

  it("snake case leaves spaces alone", () => {
    expect(one("«fooBar bazQux»", "editor.action.transformToSnakecase")).eq("foo_bar baz_qux");
  });

  it("snake case splits numbers followed by words", () => {
    expect(one("«version2Beta»", "editor.action.transformToSnakecase")).eq("version2_beta");
  });

  it("camel case lowers the first letter of a Pascal word", () => {
    expect(one("«FooBar»", "editor.action.transformToCamelcase")).eq("fooBar");
  });

  it("does nothing with the cursor on white space", () => {
    expect(code("a | b").run("editor.action.transformToUppercase").state()).eq("a | b");
  });

  it("works on selections across lines", () => {
    expect(code("«ab\ncd»").run("editor.action.transformToUppercase").lines()).toEqual(["AB", "CD"]);
  });
});

describe("in-place replace", () => {
  it("True and False keep their capital", () => {
    expect(one("|True", "editor.action.inPlaceReplace.up")).eq("False");
  });

  it("down from 0 does nothing", () => {
    expect(one("x = |0", "editor.action.inPlaceReplace.down")).eq("x = 0");
  });

  it("up from 9 carries over", () => {
    expect(one("|9", "editor.action.inPlaceReplace.up")).eq("10");
  });

  it("works on a selected value", () => {
    expect(one("«false»", "editor.action.inPlaceReplace.up")).eq("true");
  });

  it("leaves unknown words alone", () => {
    expect(one("|maybe", "editor.action.inPlaceReplace.up")).eq("maybe");
  });
});
