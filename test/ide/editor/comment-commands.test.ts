import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// VS Code's comment commands (the Vim gc/gcc spec is in test/ide).
//   editor.action.commentLine        Ctrl+/       toggle line comments
//   editor.action.addCommentLine     Ctrl+K Ctrl+C
//   editor.action.removeCommentLine  Ctrl+K Ctrl+U
//   editor.action.blockComment       Shift+Alt+A  toggle a block comment
// editor.comments.insertSpace (default true) puts a space after the token.
// editor.comments.ignoreEmptyLines (default true) skips empty lines.
// Several lines get their comment tokens lined up at the smallest
// indentation. Languages without a line comment (HTML, CSS) use their block
// comment for every line command.

const ts = { path: "a.ts" };
const toggle = "editor.action.commentLine";

describe("toggle line comment", () => {
  it("comments the line and keeps the cursor on the same text", () => {
    expect(code("|foo();", ts).run(toggle).state()).eq("// |foo();");
  });

  it("uncomments a commented line", () => {
    expect(code("// fo|o();", ts).run(toggle).state()).eq("fo|o();");
  });

  it("lines comment tokens up at the smallest indentation", () => {
    expect(code("«  a\n    b»", ts).run(toggle).lines()).toEqual(["  // a", "  //   b"]);
  });

  it("skips empty lines", () => {
    expect(code("«a\n\nb»", ts).run(toggle).lines()).toEqual(["// a", "", "// b"]);
  });

  it("comments everything when only some lines are commented", () => {
    expect(code("«// a\nb»", ts).run(toggle).lines()).toEqual(["// // a", "// b"]);
  });

  it("uncomments everything when all lines are commented", () => {
    expect(code("«// a\n// b»", ts).run(toggle).lines()).toEqual(["a", "b"]);
  });

  it("insertSpace false leaves out the space", () => {
    const vs = code("|foo();", ts).setting("editor.comments.insertSpace", false);

    expect(vs.run(toggle).lines()).toEqual(["//foo();"]);
  });

  it("uses # in Python", () => {
    expect(code("|x = 1", { path: "a.py" }).run(toggle).lines()).toEqual(["# x = 1"]);
  });

  it("uses a block comment in HTML, which has no line comment", () => {
    expect(code("|<p>", { path: "a.html" }).run(toggle).lines()).toEqual(["<!-- <p> -->"]);
  });
});

describe("add and remove line comments", () => {
  it("addCommentLine adds a comment even if there already is one", () => {
    expect(code("|// a", ts).run("editor.action.addCommentLine").lines()).toEqual(["// // a"]);
  });

  it("removeCommentLine leaves an uncommented line alone", () => {
    expect(exec("|a", "editor.action.removeCommentLine")).eq("|a");
  });

  it("removeCommentLine removes one level", () => {
    expect(code("|// // a", ts).run("editor.action.removeCommentLine").lines()).toEqual([
      "// a",
    ]);
  });
});

describe("block comment", () => {
  it("wraps the selection and keeps it selected", () => {
    expect(code("«abc»", ts).run("editor.action.blockComment").state()).eq("/* «abc» */");
  });

  it("toggling again removes it", () => {
    const vs = code("«abc»", ts)
      .run("editor.action.blockComment")
      .run("editor.action.blockComment");

    expect(vs.lines()).toEqual(["abc"]);
  });

  it("removes a block comment when the selection is inside it", () => {
    expect(code("/* a«b»c */", ts).run("editor.action.blockComment").lines()).toEqual(["abc"]);
  });

  it("uses CSS block comments", () => {
    expect(code("«a {}»", { path: "a.css" }).run("editor.action.blockComment").lines()).toEqual([
      "/* a {} */",
    ]);
  });
});
