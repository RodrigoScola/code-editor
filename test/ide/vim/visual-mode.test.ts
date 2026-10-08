import { describe, expect, it } from "vitest";
import { after, vim } from "../harness.js";

// Visual mode: v (characters, inclusive), V (lines), <C-v> (block). The
// selection is checked through what operators do to it.

describe("v (characterwise)", () => {
  it("enters visual mode", () => {
    expect(vim("|abc").keys("v").mode()).eq("visual");
  });

  it("vd deletes the character under the cursor", () => {
    expect(after("a|bc", "vd")).eq("a|c");
  });

  it("the selection includes both ends", () => {
    expect(after("|abcde", "vlld")).eq("|de");
  });

  it("can span lines", () => {
    expect(after("a|bc\ndef", "vjd")).eq("a|f");
  });

  it("y yanks the selection and returns to its start", () => {
    expect(after("|foo bar", "vey$p")).eq("foo barfo|o");
  });

  it("c changes the selection", () => {
    expect(after("|abc", "vlcX<Esc>")).eq("|Xc");
  });

  it("o moves the cursor to the other end", () => {
    expect(after("ab|cde", "vlohd")).eq("a|e");
  });

  it("works with text objects", () => {
    expect(after("foo b|ar baz", "viwd")).eq("foo | baz");
  });

  it("<Esc> leaves visual mode without changing anything", () => {
    const ide = vim("|abc").keys("vl<Esc>");

    expect(ide.mode()).eq("normal");
    expect(ide.text()).eq("a|bc");
  });

  it("gv selects the last selection again", () => {
    expect(after("|abc", "vl<Esc>gvd")).eq("|c");
  });
});

describe("case in visual mode", () => {
  it("~ toggles case", () => {
    expect(after("|abc", "vl~")).eq("|ABc");
  });

  it("U uppercases", () => {
    expect(after("|abc", "vlU")).eq("|ABc");
  });

  it("u lowercases", () => {
    expect(after("|ABC", "vlu")).eq("|abC");
  });
});

describe("V (linewise)", () => {
  it("Vd deletes the line", () => {
    expect(after("a\n|b\nc", "Vd")).eq("a\n|c");
  });

  it("Vjd deletes two lines", () => {
    expect(after("|a\nb\nc", "Vjd")).eq("|c");
  });

  it("> indents every selected line", () => {
    const lines = vim("|a\nb\nc").keys("Vj>").lines();

    expect(lines[0]).toMatch(/^\s+a$/);
    expect(lines[1]).toMatch(/^\s+b$/);
    expect(lines[2]).eq("c");
  });
});

describe("<C-v> (block)", () => {
  it("d deletes a column", () => {
    expect(after("|abc\ndef", "<C-v>jd")).eq("|bc\nef");
  });

  it("I inserts on every line of the block", () => {
    expect(after("|abc\ndef", "<C-v>jIX<Esc>")).eq("|Xabc\nXdef");
  });
});
