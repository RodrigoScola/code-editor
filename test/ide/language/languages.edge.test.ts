import { describe, expect, it } from "vitest";
import { fuzzyScore } from "../../../src/Language/suggest.js";
import { parseSnippetFile, resolveSnippet } from "../../../src/Language/snippets.js";
import { expandAbbreviation } from "../../../src/Language/emmet.js";
import { slugify, validateLinks } from "../../../src/Language/markdown.js";
import { codeActionKindContains } from "../../../src/Lsp/codeActions.js";
import { decodeSemanticTokens } from "../../../src/Lsp/semanticTokens.js";
import { validateJson } from "../../../src/Language/json.js";
import { code } from "../harness.js";

// Edge cases for language features (base specs: suggest, snippets, emmet,
// markdown, lsp-features, json, language-configuration).

describe("fuzzy score", () => {
  it("an empty query matches with no score", () => {
    expect(fuzzyScore("", "anything")).eq(0);
  });

  it("a query longer than the label never matches", () => {
    expect(fuzzyScore("abcd", "abc")).toBeNull();
  });

  it("an exact match scores best", () => {
    expect(fuzzyScore("map", "map")!).toBeGreaterThan(fuzzyScore("map", "mapAll")!);
  });

  it("matching case scores higher than other case", () => {
    expect(fuzzyScore("Foo", "Foo")!).toBeGreaterThan(fuzzyScore("Foo", "foo")!);
  });
});

describe("snippets", () => {
  const ctx = { file: "/p/a.ts", workspaceFolder: "/p", language: "typescript", now: new Date(2024, 0, 9, 1, 2, 3) };

  it("a variable default can hold a tab stop", () => {
    expect(resolveSnippet("${TM_SELECTED_TEXT:${1:fallback}}", { ...ctx, selectedText: "" })).eq("fallback");
  });

  it("a transform whose regex doesn't match leaves the value as it was", () => {
    expect(resolveSnippet("${TM_FILENAME/zzz(.*)/$1/}", ctx)).eq("a.ts");
  });

  it("a transform keeps text outside the match", () => {
    expect(resolveSnippet("${TM_FILENAME/a/A/}", ctx)).eq("A.ts");
  });

  it("$ followed by something that isn't a name stays literal", () => {
    expect(resolveSnippet("cost: $ 5", ctx)).eq("cost: $ 5");
  });

  it("an unclosed ${ is plain text", () => {
    expect(resolveSnippet("a ${1:b", ctx)).eq("a ${1:b");
  });

  it("CURRENT_DAY_NAME for a Tuesday in January", () => {
    expect(resolveSnippet("$CURRENT_DAY_NAME $CURRENT_MONTH_NAME_SHORT", ctx)).eq("Tuesday Jan");
  });

  it("a snippet file with a broken entry still reads the others", () => {
    const entries = parseSnippetFile(`{
      "Good": { "prefix": "g", "body": "good" },
      "Broken": { "prefix": "b" }
    }`);

    expect(entries.map((e: { name: string }) => e.name)).toEqual(["Good"]);
  });
});

describe("emmet", () => {
  const html = (a: string) => expandAbbreviation(a, { syntax: "html" });

  it("a custom tag name", () => {
    expect(html("my-element")).eq("<my-element></my-element>");
  });

  it("an attribute without a value", () => {
    expect(html("input[disabled]")).eq('<input type="text" disabled>');
  });

  it("several classes keep their order", () => {
    expect(html(".a.b.c")).eq('<div class="a b c"></div>');
  });

  it("* on a group repeats the group", () => {
    expect(html("(dt+dd)*2")).eq("<dt></dt>\n<dd></dd>\n<dt></dt>\n<dd></dd>");
  });

  it("^^ climbs two levels", () => {
    expect(html("div>div>p^^span")).eq("<div>\n\t<div>\n\t\t<p></p>\n\t</div>\n</div>\n<span></span>");
  });

  it("text with spaces in braces stays together", () => {
    expect(html("a{click here}")).eq('<a href="">click here</a>');
  });

  it("an empty abbreviation expands to nothing", () => {
    expect(html("")).eq("");
  });
});

describe("markdown", () => {
  it("slugs keep numbers", () => {
    expect(slugify("Step 1: Install")).eq("step-1-install");
  });

  it("slugs drop dashes left at the start or end", () => {
    expect(slugify("- item -")).eq("item");
  });

  // validateLinks reads the other file through options.readFile
  it("links to a heading in another file are checked against that file", () => {
    const problems = validateLinks("[x](./other.md#missing)", {
      path: "/d/readme.md",
      exists: (p: string) => p === "/d/other.md",
      readFile: () => "# Present",
    });

    expect(problems).toHaveLength(1);
  });

  it("links inside code blocks are not checked", () => {
    expect(validateLinks("```\n[x](./nope.md)\n```", { path: "/d/r.md", exists: () => false })).toEqual([]);
  });
});

describe("language server helpers", () => {
  it("a child kind does not contain its parent", () => {
    expect(codeActionKindContains("refactor.extract", "refactor")).eq(false);
  });

  it("semantic tokens with unknown modifier bits ignore them", () => {
    const legend = { tokenTypes: ["variable"], tokenModifiers: ["declaration"] };

    expect(decodeSemanticTokens([0, 0, 1, 0, 0b101], legend)[0].modifiers).toEqual(["declaration"]);
  });

  it("validateJson checks nested objects", () => {
    const schema = { type: "object", properties: { a: { type: "object", properties: { b: { type: "number" } } } } };

    expect(validateJson('{ "a": { "b": "x" } }', schema)[0].path).toEqual(["a", "b"]);
  });
});

describe("typing behavior", () => {
  it("a quote typed inside a string is not auto-closed", () => {
    expect(code('x = "a\\|', { path: "a.ts" }).type('"').lines()).toEqual(['x = "a\\"']);
  });

  it("Enter in the middle of a JSDoc line continues it", () => {
    expect(code("/**\n * ab|cd", { path: "a.ts" }).type("\n").lines()).toEqual(["/**", " * ab", " * cd"]);
  });
});
