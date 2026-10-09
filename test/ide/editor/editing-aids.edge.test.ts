import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Edge cases for smart select, column selection, brackets, comments and
// indentation (base specs: smart-select, column-selection, brackets,
// comments, indentation).

const expand = "editor.action.smartSelect.expand";

describe("smart select", () => {
  it("expanding on a selection that already covers a word goes outward", () => {
    expect(code("foo(«bar», baz)").run(expand).state()).eq("foo(«bar, baz»)");
  });

  it("shrink with nothing expanded does nothing", () => {
    expect(exec("a|b", "editor.action.smartSelect.shrink")).eq("a|b");
  });

  it("selectSubwords off goes straight to the whole word", () => {
    const vs = code("fooB|arBaz").setting("editor.smartSelect.selectSubwords", false);

    expect(vs.run(expand).state()).eq("«fooBarBaz»");
  });
});

describe("column selection", () => {
  it("leaves out lines shorter than the box", () => {
    expect(
      exec("ab|c\nx\nabc", "cursorColumnSelectDown", "cursorColumnSelectDown"),
    ).eq("ab|c\nx\nab|c");
  });

  it("going back up shrinks the box", () => {
    expect(exec("a|bc\ndef", "cursorColumnSelectDown", "cursorColumnSelectUp")).eq("a|bc\ndef");
  });
});

describe("brackets", () => {
  it("jumpToBracket away from brackets goes to the closing bracket around the cursor", () => {
    expect(exec("(a| b)", "editor.action.jumpToBracket")).eq("(a b|)");
  });

  it("removeBrackets does nothing outside brackets", () => {
    expect(exec("a|b", "editor.action.removeBrackets")).eq("a|b");
  });

  it("auto-surround works across lines", () => {
    expect(code("«a\nb»").type("[").lines()).toEqual(["[a", "b]"]);
  });

  it("auto-surround on several selections wraps each", () => {
    expect(code("«a» «b»").type('"').state()).eq('"«a»" "«b»"');
  });
});

describe("comments", () => {
  const ts = { path: "a.ts" };

  it("uncommenting accepts a comment with no space after //", () => {
    expect(code("|//a", ts).run("editor.action.commentLine").lines()).toEqual(["a"]);
  });

  it("a block comment over several lines", () => {
    expect(code("«a\nb»", ts).run("editor.action.blockComment").lines()).toEqual(["/* a", "b */"]);
  });
});

describe("indentation", () => {
  it("outdent on a line with less than a level removes what is there", () => {
    expect(exec("  |x", "outdent")).eq("|x");
  });

  it("tab with a single-line selection replaces it with indentation", () => {
    expect(exec("a«bc»d", "tab")).eq("a   |d");
  });

  it("indentationToTabs keeps a partial level as spaces", () => {
    expect(code("  x").run("editor.action.indentationToTabs").lines()).toEqual(["  x"]);
  });

  it("follows editor.tabSize when converting", () => {
    expect(code("\tx").setting("editor.tabSize", 2).run("editor.action.indentationToSpaces").lines()).toEqual([
      "  x",
    ]);
  });
});
