import { describe, expect, it } from "vitest";
import { code, exec } from "../harness.js";

// Edge cases for cursor movement and deleting (base spec:
// cursor-movement.test.ts).

describe("word movement across lines", () => {
  it("cursorWordEndRight at the end of a line goes to the end of the first word below", () => {
    expect(exec("ab|\ncd ef", "cursorWordEndRight")).eq("ab\ncd| ef");
  });

  it("cursorWordLeft at the start of a line goes to the start of the last word above", () => {
    expect(exec("ab cd\n|ef", "cursorWordLeft")).eq("ab |cd\nef");
  });

  it("a run of punctuation is one word", () => {
    expect(exec("|a == b", "cursorWordEndRight", "cursorWordEndRight")).eq("a ==| b");
  });
});

describe("home on a blank line", () => {
  it("stays at column 0 on an empty line", () => {
    expect(exec("|", "cursorHome")).eq("|");
  });
});

describe("selections and movement", () => {
  it("cursorUp with a multi-line selection collapses it and moves from its active end", () => {
    expect(exec("«ab\ncd»", "cursorUp")).eq("ab|\ncd");
  });

  it("extending a backwards selection forward shrinks it", () => {
    expect(exec("a»bc«d", "cursorRightSelect")).eq("ab»c«d");
  });

  it("cursorTopSelect selects to the start of the file", () => {
    expect(exec("ab\nc|d", "cursorTopSelect")).eq("»ab\nc«d");
  });
});

describe("deleting", () => {
  it("deleteLeft at the very start of the file does nothing", () => {
    expect(exec("|ab", "deleteLeft")).eq("|ab");
  });

  it("deleteRight at the very end does nothing", () => {
    expect(exec("ab|", "deleteRight")).eq("ab|");
  });

  it("deleteWordLeft over white space deletes it with the word", () => {
    expect(exec("foo   |", "deleteWordLeft")).eq("|");
  });

  it("deleteWordLeft at the start of a line joins the lines", () => {
    expect(exec("ab\n|cd", "deleteWordLeft")).eq("ab|cd");
  });

  it("deleteLeft does not remove a ) that was already there", () => {
    expect(exec("(|)", "deleteLeft")).eq("|)");
  });

  it("deleteLeft removes an auto-closed quote pair", () => {
    expect(code("|").type('"').run("deleteLeft").state()).eq("|");
  });
});
