import { describe, expect, it } from "vitest";
import { after } from "../harness.js";

// Registers: where yanks and deletes go, and where p reads from.
//   ""     unnamed: the last yank or delete
//   "a-"z  named; "A-"Z append to them
//   "0     the last yank
//   "1-"9  the last line deletes, newest first
//   "_     black hole: deleting into it keeps the other registers
// :help registers

describe("registers", () => {
  it("p puts what was just deleted", () => {
    expect(after("|a\nb", "ddp")).eq("b\n|a");
  });

  it('"ayy and "ap use a named register', () => {
    expect(after("|a\nb", '"ayyj"ap')).eq("a\nb\n|a");
  });

  it('"A appends to register a', () => {
    expect(after("|a\nb\nc", '"ayyj"Ayyj"ap')).eq("a\nb\nc\n|a\nb");
  });

  it('"0 keeps the last yank after a delete', () => {
    expect(after("|a\nb", 'yyjdd"0p')).eq("a\n|a");
  });

  it('"1 and "2 hold the last two line deletes', () => {
    expect(after("|a\nb\nc", 'dddd"2p')).eq("c\n|a");
  });

  it('"_ deletes without touching the unnamed register', () => {
    expect(after("|a\nb", 'yyj"_ddp')).eq("a\n|a");
  });

  it("<C-r> in insert mode inserts a register", () => {
    expect(after("|foo", '"ayiwA<C-r>a<Esc>')).eq("foofo|o");
  });
});
