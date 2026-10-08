import { describe, expect, it } from "vitest";
import { after } from "../harness.js";

// Counts on operators and the . command, which repeats the last change.

describe("counts on edits", () => {
  it("d2w deletes two words", () => {
    expect(after("|a b c d", "d2w")).eq("|c d");
  });

  it("3ia<Esc> inserts the text three times", () => {
    expect(after("|", "3ia<Esc>")).eq("aa|a");
  });

  it("3p puts three times", () => {
    expect(after("|a", "yl3p")).eq("aaa|a");
  });
});

describe("the . command", () => {
  it("repeats dw", () => {
    expect(after("|a b c d", "dw.")).eq("|c d");
  });

  it("repeats a counted x with the same count", () => {
    expect(after("|abcdef", "2x.")).eq("|ef");
  });

  it("repeats 2dd", () => {
    expect(after("|1\n2\n3\n4\n5", "2dd.")).eq("|5");
  });

  it("a new count replaces the old one", () => {
    expect(after("|a b c d e", "dw3.")).eq("|e");
  });

  it("repeats an insert", () => {
    expect(after("|", "ihi<Esc>.")).eq("hh|ii");
  });

  it("repeats an append on another line", () => {
    expect(after("|foo\nbar", "A;<Esc>j.")).eq("foo;\nbar|;");
  });

  it("repeats a change", () => {
    expect(after("|foo foo", "cwbar<Esc>w.")).eq("bar ba|r");
  });

  it("does not repeat motions", () => {
    expect(after("|a b c d", "dww.")).eq("b |d");
  });
});
