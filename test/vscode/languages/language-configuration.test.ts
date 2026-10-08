import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Typing behavior that comes from each language's configuration
// (language-configuration.json in VS Code):
//   autoClosingPairs with notIn: ["string", "comment"]
//   autoCloseBefore: the characters an auto-close may happen in front of
//   surroundingPairs: what auto-surround wraps a selection with
//   onEnterRules: e.g. continuing " * " inside a JSDoc comment
//   indentationRules: indent after {, outdent on }
//   wordPattern: what a "word" is (CSS words contain -)
// Linked editing (editor.linkedEditing): in HTML, editing an opening tag's
// name edits the closing tag's name too.
// Typing a line break goes through the "type" command with "\n", like the
// Enter key does in VS Code.

const ts = { path: "a.ts" };

describe("auto-closing pairs", () => {
  it("a quote inside a string is not auto-closed", () => {
    expect(code('x = "a|"', ts).type("'").state()).eq("x = \"a'|\"");
  });

  it("a quote inside a comment is not auto-closed", () => {
    expect(code("// it|", ts).type("'").state()).eq("// it'|");
  });

  it("a bracket inside a comment still is", () => {
    expect(code("// x |", ts).type("(").state()).eq("// x (|)");
  });

  it("closes in front of a closing bracket", () => {
    expect(code("|)", ts).type("(").state()).eq("(|))");
  });

  it("closes backticks in TypeScript", () => {
    expect(code("|", ts).type("`").state()).eq("`|`");
  });
});

describe("surrounding pairs", () => {
  it("wraps a selection in square brackets", () => {
    expect(code("«abc»", ts).type("[").state()).eq("[«abc»]");
  });

  it("wraps a selection in backticks", () => {
    expect(code("«abc»", ts).type("`").state()).eq("`«abc»`");
  });
});

describe("on enter rules", () => {
  it("Enter after /** starts a JSDoc line", () => {
    expect(code("/**|", ts).type("\n").state()).eq("/**\n * |");
  });

  it("Enter between /** and */ opens a JSDoc block", () => {
    expect(code("/**|*/", ts).type("\n").state()).eq("/**\n * |\n */");
  });

  it("Enter on a JSDoc line continues it", () => {
    expect(code("/**\n * foo|", ts).type("\n").state()).eq("/**\n * foo\n * |");
  });

  it("Enter between {} puts the cursor on an indented line in between", () => {
    expect(code("{|}", ts).type("\n").state()).eq("{\n    |\n}");
  });

  it("Enter after a Python colon indents", () => {
    expect(code("def f():|", { path: "a.py" }).type("\n").state()).eq("def f():\n    |");
  });
});

describe("word pattern", () => {
  it("a CSS word includes dashes", () => {
    const vs = code("fo|nt-size: 1px", { path: "a.css" }).run(
      "editor.action.addSelectionToNextFindMatch",
    );

    expect(vs.state()).eq("«font-size»: 1px");
  });

  it("a TypeScript word stops at a dash", () => {
    const vs = code("fo|nt-size", ts).run("editor.action.addSelectionToNextFindMatch");

    expect(vs.state()).eq("«font»-size");
  });
});

describe("linked editing", () => {
  const html = { path: "a.html" };

  it("typing in an opening tag name changes the closing tag", () => {
    const vs = code("<di|v></div>", html).setting("editor.linkedEditing", true).type("x");

    expect(vs.lines()).toEqual(["<dixv></dixv>"]);
  });

  it("is off by default", () => {
    expect(code("<di|v></div>", html).type("x").lines()).toEqual(["<dixv></div>"]);
  });
});
