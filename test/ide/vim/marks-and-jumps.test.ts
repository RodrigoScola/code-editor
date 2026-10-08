import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// m{a-z} sets a mark, `a jumps to it exactly, 'a to its line. Big moves (G,
// gg, searches, marks) are "jumps": <C-o> goes back through them and <Tab>
// forward again (terminals send Ctrl+I as Tab). '' goes back to the line
// before the last jump. :help mark-motions

describe("marks", () => {
  it("`a jumps to the exact position", () => {
    expect(after("ab|c\nd\ne", "maG`a")).eq("ab|c\nd\ne");
  });

  it("'a jumps to the first non-blank of the line", () => {
    expect(after("  a|bc\nd", "maj'a")).eq("  |abc\nd");
  });

  it("works as a motion: d'a deletes the lines up to the mark", () => {
    expect(after("|a\nb\nc\nd", "majjd'a")).eq("|d");
  });

  it("moves with the text when lines are added above", () => {
    expect(after("a\n|b", "maggOx<Esc>`a")).eq("x\na\n|b");
  });
});

describe("jump list", () => {
  it("<C-o> goes back to where the jump started", () => {
    const ide = vim("|a\nb\nc").keys("G");
    expect(ide.cursor().line).eq(2);

    expect(ide.keys("<C-o>").cursor().line).eq(0);
  });

  it("<Tab> goes forward again", () => {
    expect(vim("|a\nb\nc").keys("G<C-o><Tab>").cursor().line).eq(2);
  });

  it("searches are jumps", () => {
    const ide = vim("|a\nb\nc").keys("/c<CR>");
    expect(ide.cursor().line).eq(2);

    expect(ide.keys("<C-o>").cursor().line).eq(0);
  });

  it("'' goes back to the line before the last jump", () => {
    const ide = vim("|a\nb\nc").keys("G");
    expect(ide.cursor().line).eq(2);

    expect(ide.keys("''").cursor().line).eq(0);
  });

  it("small moves are not jumps", () => {
    expect(vim("|a\nb\nc").keys("jj<C-o>").cursor().line).eq(2);
  });
});
