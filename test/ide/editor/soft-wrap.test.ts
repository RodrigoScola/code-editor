import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// Soft wrap in the code window (Vim's 'wrap', on by default): a line longer
// than the window continues on the next screen rows. Only the screen
// changes; the buffer still has one line.
//   :set nowrap      one row per line, scroll sideways instead
//   :set linebreak   wrap at spaces instead of in the middle of a word
//                    (the UI's word wrap mode)
//   gj / gk          move by screen row instead of by buffer line
// The line number is drawn on the first row of a wrapped line only.

const size = { width: 40, height: 16 };

// a line that needs exactly two rows, then a short one
function longLine() {
  const ide = vim("|x", size);
  ide.screen();
  const width = ide.textArea().width;
  const long = "a".repeat(width) + "b".repeat(10);
  const fresh = vim(`|${long}\nnext`, size);
  fresh.screen();
  return { ide: fresh, width };
}

const gutter = (ide: ReturnType<typeof vim>) => {
  const rows = ide.textRows();
  const x = ide.textArea().x;
  return rows.map((row) => row.slice(0, x).trim());
};

describe("wrapping long lines", () => {
  it("continues a long line on the next row", () => {
    const { ide } = longLine();
    const rows = ide.textRows();

    expect(rows[0]).toContain("aaaa");
    expect(rows[1]).toContain("bbbbbbbbbb");
    expect(rows[2]).toContain("next");
  });

  it("does not change the buffer", () => {
    expect(longLine().ide.lines()).length(2);
  });

  it("numbers only the first row of a wrapped line", () => {
    const { ide } = longLine();

    expect(gutter(ide).slice(0, 3)).toEqual(["1", "", "2"]);
  });

  it(":set nowrap gives each line one row", () => {
    const { ide } = longLine();

    ide.keys(":set nowrap<CR>");

    expect(ide.textRows()[1]).toContain("next");
  });

  it(":set linebreak wraps between words", () => {
    const ide = vim("|x", size);
    ide.screen();
    const width = ide.textArea().width;
    // the second word would straddle the right edge
    const text = "a".repeat(width - 3) + " " + "bbbbbb";
    const wrapped = vim(`|${text}`, size).keys(":set linebreak<CR>");

    const rows = wrapped.textRows();

    expect(rows[0]).not.toContain("b");
    expect(rows[1]).toContain("bbbbbb");
  });
});

describe("moving through wrapped lines", () => {
  it("gj moves down one screen row within the line", () => {
    const { ide, width } = longLine();

    ide.keys("gj");

    expect(ide.cursor()).toEqual({ line: 0, column: width });
  });

  it("gk moves back up a screen row", () => {
    const { ide, width } = longLine();
    expect(ide.keys("gj").cursor()).toEqual({ line: 0, column: width });

    expect(ide.keys("gk").cursor()).toEqual({ line: 0, column: 0 });
  });

  it("j still moves by buffer line", () => {
    expect(longLine().ide.keys("j").cursor().line).eq(1);
  });
});
