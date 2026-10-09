import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Bracket commands and auto-closing settings.
//   editor.action.jumpToBracket      Ctrl+Shift+\  (cursor goes to the start
//                                    of the matching bracket)
//   editor.action.selectToBracket    selects the pair and what's inside
//   editor.action.removeBrackets     Ctrl+Alt+Backspace: removes the pair
//                                    around the cursor, keeps the contents
// editor.autoSurround: typing a quote or bracket with text selected wraps
// the selection (and keeps it selected) instead of replacing it.
// editor.autoClosingBrackets: "languageDefined" (default: only before
// white space or one of ;:.,=}])> ), "always", "beforeWhitespace", "never".

describe("jump and select", () => {
  it("jumps from an opening bracket to its match", () => {
    expect(exec("|(ab)", "textEditor.jumpToBracket")).eq("(ab|)");
  });

  it("jumps back from the closing bracket", () => {
    expect(exec("(ab|)", "textEditor.jumpToBracket")).eq("|(ab)");
  });

  it("skips nested pairs", () => {
    expect(exec("|(a(b)c)", "textEditor.jumpToBracket")).eq("(a(b)c|)");
  });

  it("selectToBracket selects the pair around the cursor", () => {
    expect(exec("x(a|b)y", "textEditor.selectToBracket")).eq("x«(ab)»y");
  });

  it("removeBrackets removes the pair around the cursor", () => {
    expect(exec("f(a|b)", "textEditor.removeBrackets")).eq("fa|b");
  });

  it("removeBrackets removes the innermost pair", () => {
    expect(exec("[(a|b)]", "textEditor.removeBrackets")).eq("[a|b]");
  });
});

describe("auto surround", () => {
  it("typing a quote with text selected wraps it", () => {
    expect(code("«abc»").type('"').state()).eq('"«abc»"');
  });

  it("typing a bracket wraps it in the pair", () => {
    expect(code("«abc»").type("(").state()).eq("(«abc»)");
  });

  it("is off with editor.autoSurround never: the selection is replaced", () => {
    // the ( still auto-closes, because it ends up at the end of the line
    expect(code("«abc»").setting("auto_surround", "never").type("(").state()).eq("(|)");
  });
});

describe("auto-closing brackets", () => {
  it("languageDefined closes before white space", () => {
    expect(code("| x").type("(").state()).eq("(|) x");
  });

  it("languageDefined closes before ; and other closing characters", () => {
    expect(code("|;").type("(").state()).eq("(|);");
  });

  it("languageDefined does not close before a word", () => {
    expect(code("|x").type("(").state()).eq("(|x");
  });

  it("always closes before a word too", () => {
    expect(code("|x").setting("auto_closing_brackets", "always").type("(").state()).eq(
      "(|)x",
    );
  });

  it("never does not close", () => {
    expect(code("|").setting("auto_closing_brackets", "never").type("(").state()).eq("(|");
  });

  it("typing the closing bracket over an auto-inserted one steps over it", () => {
    expect(code("|").type("(").type(")").state()).eq("()|");
  });
});
