import { describe, expect, it } from "vitest";
import { guessIndentation } from "../../../src/Editor/indentation.js";
import { code, exec } from "../harness.js";

// Proposed module src/Editor/indentation.ts:
//   guessIndentation(lines, defaultTabSize, defaultInsertSpaces)
//     -> { tabSize, insertSpaces }
// VS Code's editor.detectIndentation looks at how indentation changes from
// line to line, picks tabs or spaces by which is used more, and a tab size
// from 2, 4, 6 or 8. With nothing to go on it keeps the defaults.
//
// Commands:
//   tab / outdent                         Tab / Shift+Tab
//   editor.action.indentationToSpaces / indentationToTabs
//   editor.action.reindentlines           (uses the language's rules)
//   editor.action.detectIndentation
// Settings: editor.tabSize (4), editor.insertSpaces (true),
// editor.useTabStops (Backspace in leading space goes back a whole stop).

describe("guessIndentation", () => {
  it("finds 2 spaces", () => {
    expect(guessIndentation(["a {", "  b", "  c", "}"], 4, true)).toEqual({
      tabSize: 2,
      insertSpaces: true,
    });
  });

  it("finds 4 spaces", () => {
    expect(guessIndentation(["a {", "    b", "}"], 2, true)).toEqual({
      tabSize: 4,
      insertSpaces: true,
    });
  });

  it("finds tabs and keeps the default tab size", () => {
    expect(guessIndentation(["a {", "\tb", "\t\tc", "}"], 4, true)).toEqual({
      tabSize: 4,
      insertSpaces: false,
    });
  });

  it("keeps the defaults when nothing is indented", () => {
    expect(guessIndentation(["a", "b"], 8, false)).toEqual({ tabSize: 8, insertSpaces: false });
  });

  it("goes by the step between lines, not the total depth", () => {
    expect(guessIndentation(["a", "  b", "    c", "      d", "  e"], 4, true).tabSize).eq(2);
  });

  it("picks whichever of tabs and spaces is used more", () => {
    const lines = ["a", "\tb", "\tc", "\td", "    e"];

    expect(guessIndentation(lines, 4, true).insertSpaces).eq(false);
  });
});

describe("tab and outdent", () => {
  it("tab at the start inserts one level of spaces", () => {
    expect(exec("|x", "textEditor.tab")).eq("    |x");
  });

  it("tab after text goes to the next tab stop", () => {
    expect(exec("a|", "textEditor.tab")).eq("a   |");
  });

  it("tab with a multi-line selection indents the lines", () => {
    expect(code("«a\nb»").executeCommand("textEditor.tab").lines()).toEqual(["    a", "    b"]);
  });

  it("outdent removes a level", () => {
    expect(exec("    |x", "textEditor.outdent")).eq("|x");
  });

  it("tab inserts a tab character with insertSpaces off", () => {
    expect(code("|x").setting("expand_tab", false).executeCommand("textEditor.tab").lines()).toEqual(["\tx"]);
  });

  it("follows editor.tabSize", () => {
    expect(code("|x").setting("tab_width", 2).executeCommand("textEditor.tab").lines()).toEqual(["  x"]);
  });

  it("deleteLeft in leading spaces goes back a whole tab stop", () => {
    expect(exec("        |x", "textEditor.deleteLeft")).eq("    |x");
  });
});

describe("converting indentation", () => {
  it("indentationToSpaces turns tabs into spaces", () => {
    expect(code("\tx\n\t\ty").executeCommand("textEditor.indentationToSpaces").lines()).toEqual([
      "    x",
      "        y",
    ]);
  });

  it("indentationToTabs turns each full level into a tab", () => {
    expect(code("    x\n      y").executeCommand("textEditor.indentationToTabs").lines()).toEqual([
      "\tx",
      "\t  y",
    ]);
  });

  it("only touches leading white space", () => {
    expect(code("\tx\ty").executeCommand("textEditor.indentationToSpaces").lines()).toEqual([
      "    x\ty",
    ]);
  });
});

describe("reindenting", () => {
  it("reindentlines fixes indentation from the language's rules", () => {
    expect(code("{\nx\n}", { path: "a.ts" }).executeCommand("textEditor.reindentLines").lines()).toEqual([
      "{",
      "    x",
      "}",
    ]);
  });

  it("detectIndentation applies what it finds to the editor", () => {
    const ide = code("a {\n  b\n}").executeCommand("textEditor.detectIndentation");

    expect(ide.executeCommand("textEditor.indentLines").lines()[0]).eq("  a {");
  });
});
