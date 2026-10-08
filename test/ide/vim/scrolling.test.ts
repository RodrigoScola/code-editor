import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";

// The view follows the cursor, and the scroll commands move the view.
// "rows" is how many text lines fit on screen; it is read after the first
// frame so these tests don't depend on the exact window layout.
//
//   <C-e> / <C-y>  view down / up one line, cursor stays (unless pushed off)
//   <C-d> / <C-u>  view and cursor down / up half a screen
//   <C-f> / <C-b>  a screen forward / back, keeping two lines of overlap
//   zt / zz / zb   put the cursor line at the top / middle / bottom
//   H / M / L      cursor to the top / middle / bottom line on screen

function tall() {
  const text = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
  const ide = vim(text, { width: 40, height: 16 });
  ide.screen();
  const rows = ide.textArea().height;
  return { ide, rows };
}

// moves without counts, so these don't depend on count support
const down = (n: number) => "j".repeat(n);

describe("following the cursor", () => {
  it("the viewport knows how many lines fit after a frame", () => {
    const { ide, rows } = tall();

    expect(rows).greaterThan(3);
    expect(ide.viewport().visibleLines).eq(rows);
  });

  it("scrolls down when the cursor goes below the screen", () => {
    const { ide, rows } = tall();

    ide.keys(down(rows + 5));
    const shown = ide.textRows().join("\n");

    expect(shown).toContain(`line ${rows + 5}`);
    expect(shown).not.toContain("line 0 ");
  });

  it("scrolls up when the cursor goes above the screen", () => {
    const { ide, rows } = tall();

    ide.keys(down(rows + 5));
    expect(ide.textRows()[0]).not.toContain("line 0 ");
    ide.keys("gg");

    expect(ide.textRows()[0]).toContain("line 0");
  });

  it("with nowrap, scrolls sideways for long lines", () => {
    const ide = vim(`|${"x".repeat(200)}END\nnext`, { width: 40, height: 16 });

    ide.keys(":set nowrap<CR>$");
    const rows = ide.textRows();

    // one row per line, scrolled so the end of the long line shows
    expect(rows[0]).toContain("END");
    expect(rows[1]).toContain("next");
  });
});

describe("scroll commands", () => {
  it("<C-e> moves the view down a line and leaves the cursor", () => {
    const { ide } = tall();
    ide.keys(down(3)).screen();

    ide.keys("<C-e>").screen();

    expect(ide.viewport().firstLine).eq(1);
    expect(ide.cursor().line).eq(3);
  });

  it("<C-e> pushes the cursor down when it would leave the screen", () => {
    const { ide } = tall();

    ide.keys("<C-e>").screen();

    expect(ide.cursor().line).eq(1);
  });

  it("<C-y> moves the view back up", () => {
    const { ide } = tall();
    ide.keys(down(3)).screen();

    ide.keys("<C-e><C-e><C-y>").screen();

    expect(ide.viewport().firstLine).eq(1);
  });

  it("<C-d> moves view and cursor down half a screen", () => {
    const { ide, rows } = tall();
    const half = Math.floor(rows / 2);

    ide.keys("<C-d>").screen();

    expect(ide.viewport().firstLine).eq(half);
    expect(ide.cursor().line).eq(half);
  });

  it("<C-u> moves them back up", () => {
    const { ide } = tall();

    ide.keys("<C-d>").screen();
    expect(ide.viewport().firstLine).greaterThan(0);
    ide.keys("<C-u>").screen();

    expect(ide.viewport().firstLine).eq(0);
    expect(ide.cursor().line).eq(0);
  });

  it("<C-f> goes forward a screen, keeping two lines of overlap", () => {
    const { ide, rows } = tall();

    ide.keys("<C-f>").screen();

    expect(ide.viewport().firstLine).eq(rows - 2);
    expect(ide.cursor().line).eq(rows - 2);
  });

  it("<C-b> goes back a screen", () => {
    const { ide } = tall();

    ide.keys("<C-f>").screen();
    expect(ide.viewport().firstLine).greaterThan(0);
    ide.keys("<C-b>").screen();

    expect(ide.viewport().firstLine).eq(0);
  });
});

describe("placing the cursor line", () => {
  function atLine20() {
    const { ide, rows } = tall();
    ide.keys(down(20)).screen();
    return { ide, rows };
  }

  it("zt puts it at the top", () => {
    const { ide } = atLine20();

    ide.keys("zt").screen();

    expect(ide.viewport().firstLine).eq(20);
  });

  it("zz puts it in the middle", () => {
    const { ide, rows } = atLine20();

    ide.keys("zz").screen();

    expect(ide.viewport().firstLine).eq(20 - Math.floor((rows - 1) / 2));
  });

  it("zb puts it at the bottom", () => {
    const { ide, rows } = atLine20();

    ide.keys("zb").screen();

    expect(ide.viewport().firstLine).eq(20 - rows + 1);
  });
});

describe("H M L", () => {
  function scrolledTo20() {
    const { ide, rows } = tall();
    ide.keys(down(20)).screen();
    ide.keys("zt").screen();
    return { ide, rows };
  }

  it("H goes to the top line on screen", () => {
    const { ide } = scrolledTo20();

    expect(ide.keys(down(3)).keys("H").cursor().line).eq(20);
  });

  it("L goes to the bottom line on screen", () => {
    const { ide, rows } = scrolledTo20();

    expect(ide.keys("L").cursor().line).eq(20 + rows - 1);
  });

  it("M goes to the middle line on screen", () => {
    const { ide, rows } = scrolledTo20();

    const line = ide.keys("M").cursor().line;

    expect(Math.abs(line - 20 - (rows - 1) / 2)).toBeLessThanOrEqual(0.5);
  });
});
