import { describe, expect, it } from "vitest";
import { parseSnippet } from "../../../src/Language/snippets.js";
import { vim } from "../harness.js";

// Proposed module src/Language/snippets.ts, using the snippet syntax VS Code
// and language servers use:
//   $1 $2 ...       tab stops, visited in order; $0 is the last one (the
//                   end of the snippet when there is no $0)
//   ${1:text}       a tab stop with placeholder text, selected when visited
//   $1 again        a mirror: typing in one changes both
//   ${1|a,b|}       a choice, the first one is inserted
//   \$  \}  \\      literal characters
//
//   parseSnippet(body) -> { text, tabstops: [{ index, ranges: [{ start, end }] }] }
//     text has the placeholders filled in, ranges are offsets into it, and
//     tabstops come in visiting order
//
// In the editor: ctx.snippets.add(language, { prefix, body }). Typing the
// prefix then <Tab> in insert mode expands it; typing replaces the selected
// placeholder; <Tab> goes to the next tab stop.

describe("parseSnippet", () => {
  it("leaves plain text alone and ends at the end", () => {
    expect(parseSnippet("hello")).toEqual({
      text: "hello",
      tabstops: [{ index: 0, ranges: [{ start: 5, end: 5 }] }],
    });
  });

  it("finds tab stops", () => {
    const { text, tabstops } = parseSnippet("f($1)");

    expect(text).eq("f()");
    expect(tabstops[0]).toEqual({ index: 1, ranges: [{ start: 2, end: 2 }] });
  });

  it("fills in placeholders and covers them with the range", () => {
    const { text, tabstops } = parseSnippet("let ${1:name} = 1;");

    expect(text).eq("let name = 1;");
    expect(tabstops[0]).toEqual({ index: 1, ranges: [{ start: 4, end: 8 }] });
  });

  it("gives a mirrored tab stop one range per copy", () => {
    const { text, tabstops } = parseSnippet("${1:a} = $1");

    expect(text).eq("a = a");
    expect(tabstops[0].ranges).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 5 },
    ]);
  });

  it("visits $1, $2, ... and $0 last", () => {
    const { tabstops } = parseSnippet("$2 $0 $1");

    expect(tabstops.map((stop) => stop.index)).toEqual([1, 2, 0]);
  });

  it("handles placeholders inside placeholders", () => {
    const { text, tabstops } = parseSnippet("${1:a ${2:b}}");

    expect(text).eq("a b");
    expect(tabstops[0].ranges).toEqual([{ start: 0, end: 3 }]);
    expect(tabstops[1].ranges).toEqual([{ start: 2, end: 3 }]);
  });

  it("inserts the first choice", () => {
    expect(parseSnippet("${1|one,two|}").text).eq("one");
  });

  it("keeps escaped characters literal", () => {
    expect(parseSnippet("\\$1 \\}").text).eq("$1 }");
  });

  it("keeps new lines", () => {
    expect(parseSnippet("a\n\t$0\nb").text).eq("a\n\t\nb");
  });
});

describe("snippets in the editor", () => {
  function withSnippet() {
    const ide = vim("|", { path: "a.ts" });
    ide.snippets.add("typescript", {
      prefix: "fn",
      body: "function ${1:name}() {\n\t$0\n}",
    });
    return ide;
  }

  it("<Tab> after a prefix expands the snippet", () => {
    const lines = withSnippet().keys("ifn<Tab>").lines();

    expect(lines).length(3);
    expect(lines[0]).eq("function name() {");
    expect(lines[2]).eq("}");
  });

  it("typing replaces the selected placeholder", () => {
    expect(withSnippet().keys("ifn<Tab>foo").lines()[0]).eq("function foo() {");
  });

  it("<Tab> goes to the next tab stop", () => {
    const lines = withSnippet().keys("ifn<Tab>foo<Tab>x<Esc>").lines();

    expect(lines[1].trim()).eq("x");
  });

  it("<Tab> after a word that is not a prefix inserts a tab", () => {
    expect(withSnippet().keys("ixyz<Tab><Esc>").lines()).toEqual(["xyz\t"]);
  });
});
