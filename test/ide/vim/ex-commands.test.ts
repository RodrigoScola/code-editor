import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// The : command line. The status line shows what is being typed, <BS>
// edits it, <Up> recalls history, <Tab> completes command names, and
// unknown commands report an error instead of doing nothing.
//
// Ranges: N (a line), $ (last line), . (current line), N,M (lines N to M).

const lines = (count: number) =>
  Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");

describe("the command line", () => {
  it("shows what is being typed", () => {
    expect(vim("|abc").keys(":hel").statusLine()).toContain(":hel");
  });

  it("<BS> deletes a typed character", () => {
    expect(vim(lines(10)).keys(":5x<BS><CR>").cursor().line).eq(4);
  });

  it("<Up> recalls the previous command", () => {
    expect(vim(lines(10)).keys(":3<CR>gg:<Up><CR>").cursor().line).eq(2);
  });

  it("<Tab> completes a command name", () => {
    expect(vim("|abc").keys(":vspl<Tab>").statusLine()).toContain(":vsplit");
  });

  it("reports unknown commands", () => {
    const ide = vim("|abc").keys(":foo<CR>");

    expect(ide.statusLine()).toContain("Not an editor command: foo");
    expect(ide.mode()).eq("normal");
  });
});

describe("going to lines", () => {
  it(":5 goes to line 5", () => {
    expect(vim(lines(10)).keys(":5<CR>").cursor().line).eq(4);
  });

  it(":$ goes to the last line", () => {
    expect(vim(lines(10)).keys(":$<CR>").cursor().line).eq(9);
  });
});

describe("line commands", () => {
  it(":d deletes the current line", () => {
    expect(after("a\n|b\nc", ":d<CR>")).eq("a\n|c");
  });

  it(":2,3d deletes a range", () => {
    expect(after("|a\nb\nc\nd", ":2,3d<CR>")).eq("a\n|d");
  });

  it(":m+1 moves the line down", () => {
    expect(after("|a\nb\nc", ":m+1<CR>")).eq("b\n|a\nc");
  });

  it(":t. copies the line below", () => {
    expect(after("|a\nb", ":t.<CR>")).eq("a\n|a\nb");
  });
});
