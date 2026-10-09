import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Edge cases for multiple cursors (base spec: multi-cursor.test.ts).

const next = "textEditor.addSelectionToNextMatch";

describe("adding cursors on lines of different lengths", () => {
  it("a cursor added below a shorter line goes to its end", () => {
    expect(exec("abc|d\nx", "textEditor.addCursorBelow")).eq("abc|d\nx|");
  });

  it("keeps the wanted column for the line after that", () => {
    expect(
      exec("abc|d\nx\nabcdef", "textEditor.addCursorBelow", "textEditor.addCursorBelow"),
    ).eq("abc|d\nx|\nabc|def");
  });
});

describe("Ctrl+D details", () => {
  it("starting from a selection ignores case by default", () => {
    expect(exec("«foo» FOO", next)).eq("«foo» «FOO»");
  });

  it("typing after Ctrl+D replaces every occurrence", () => {
    expect(code("f|oo foo").executeCommand(next).executeCommand(next).type("bar").state()).eq("bar| bar|");
  });

  it("does nothing on white space", () => {
    expect(exec("a | b", "textEditor.selectAllMatches")).eq("a | b");
  });
});

describe("end of each selected line", () => {
  it("leaves out a line the selection only touches at column 0", () => {
    expect(exec("«ab\ncd\n»ef", "textEditor.addCursorsToLineEnds")).eq("ab|\ncd|\nef");
  });

  it("works on several selections", () => {
    expect(exec("«a»\nb\n«c»", "textEditor.addCursorsToLineEnds")).eq("a|\nb\nc|");
  });
});

describe("editing with several cursors", () => {
  it("cursors on the same line each type", () => {
    expect(code("a|b|c").type("X").state()).eq("aX|bX|c");
  });

  it("deleteLeft at the start of two lines joins both", () => {
    expect(code("a\n|b\nc\n|d").executeCommand("textEditor.deleteLeft").state()).eq("a|b\nc|d");
  });

  it("one undo removes what every cursor typed", () => {
    expect(code("a|\nb|").type("X").executeCommand("textEditor.undo").state()).eq("a|\nb|");
  });

  it("cursors that move onto the same spot merge", () => {
    expect(code("|a\n|b").executeCommand("textEditor.cursorTop").state()).eq("|a\nb");
  });

  it("typing a line break at every cursor", () => {
    expect(code("a|b\nc|d").type("\n").lines()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("textEditor.removeSecondaryCursors", () => {
  it("keeps a lone selection as it is", () => {
    expect(exec("a«bc»d", "textEditor.removeSecondaryCursors")).eq("a«bc»d");
  });
});
