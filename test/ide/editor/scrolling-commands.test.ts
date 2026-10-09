import { describe, expect, it } from "vitest";
import { UiPanel } from "../../../src/ui/components/UiComponent.js";
import { code } from "../harness.js";

// Scrolling the view without (or with) the cursor, VS Code style. The Vim
// keys for the same things are in test/ide/vim/scrolling.test.ts.
//
//   textEditor.scrollLineDown / scrollLineUp     VS Code: scrollLineDown, Ctrl+Down
//   textEditor.scrollPageDown / scrollPageUp     VS Code: scrollPageDown, Alt+PageDown
//     the view moves; the cursor only moves when it would leave the view
//   textEditor.cursorPageDown / cursorPageUp     VS Code: cursorPageDown, PageDown
//     the cursor moves a page, the view follows
//   textEditor.revealLine (args { lineNumber, at: "top" | "center" | "bottom" })
//                                                VS Code: revealLine
//
// Settings:
//   cursor_surrounding_lines   (editor.cursorSurroundingLines) keep this many
//     lines visible above and below the cursor when it moves, like Vim's
//     scrolloff. Never more than half the view.
//   line_numbers   (editor.lineNumbers) "on" | "off" | "relative" | "interval"
//     "interval" shows every 10th line number and the cursor's line
//   tab_moves_focus   (editor.tabFocusMode, toggled by
//     textEditor.toggleTabFocusMode, Ctrl+M) Tab moves focus out of the
//     editor instead of typing a tab

const size = { width: 40, height: 12 };

const tall = (count: number) =>
  Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");

// the text with the cursor on the given line
function at(line: number, count = 100) {
  const lines = tall(count).split("\n");
  lines[line] = "|" + lines[line];
  return lines.join("\n");
}

function editor(line = 0, count = 100) {
  const ide = code(at(line, count), size);
  ide.screen(); // lays the view out so it knows how many rows it has
  return ide;
}

// how many text rows the view shows (from the last rendered frame; the
// viewport's own count can be unset)
const rows = (ide: ReturnType<typeof code>) => ide.textArea().height;

describe("scrolling by line", () => {
  it("scrollLineDown moves the view one line and leaves the cursor", () => {
    const ide = editor(5);

    ide.executeCommand("textEditor.scrollLineDown");

    expect(ide.viewport().firstLine).eq(1);
    expect(ide.cursor().line).eq(5);
  });

  it("scrollLineUp moves the view back", () => {
    const ide = editor(5);

    ide.executeCommand("textEditor.scrollLineDown");
    ide.executeCommand("textEditor.scrollLineDown");
    ide.executeCommand("textEditor.scrollLineUp");

    expect(ide.viewport().firstLine).eq(1);
  });

  it("scrollLineUp at the top does nothing", () => {
    const ide = editor(0);

    ide.executeCommand("textEditor.scrollLineUp");

    expect(ide.viewport().firstLine).eq(0);
  });

  it("pulls the cursor along when it would scroll out of view", () => {
    const ide = editor(0);

    ide.executeCommand("textEditor.scrollLineDown");

    expect(ide.viewport().firstLine).eq(1);
    expect(ide.cursor().line).eq(1);
  });

  it("stops when the last line reaches the top", () => {
    const ide = editor(0, 3);

    for (let i = 0; i < 10; i++) ide.executeCommand("textEditor.scrollLineDown");

    expect(ide.viewport().firstLine).eq(2);
  });
});

describe("scrolling by page", () => {
  it("scrollPageDown moves the view a whole page", () => {
    const ide = editor(0);
    const page = rows(ide);

    ide.executeCommand("textEditor.scrollPageDown");

    expect(ide.viewport().firstLine).eq(page);
  });

  it("scrollPageUp goes back a page", () => {
    const ide = editor(0);
    const page = rows(ide);

    ide.executeCommand("textEditor.scrollPageDown");
    ide.executeCommand("textEditor.scrollPageDown");
    ide.executeCommand("textEditor.scrollPageUp");

    expect(ide.viewport().firstLine).eq(page);
  });

  it("cursorPageDown moves the cursor a page and the view follows", () => {
    const ide = editor(0);
    const page = rows(ide);

    ide.executeCommand("textEditor.cursorPageDown");

    expect(ide.cursor().line).eq(page);
    const { firstLine } = ide.viewport();
    expect(firstLine).toBeLessThanOrEqual(page);
    expect(firstLine + rows(ide)).toBeGreaterThan(page);
  });

  it("cursorPageUp at the top goes to the first line", () => {
    const ide = editor(3);

    ide.executeCommand("textEditor.cursorPageUp");

    expect(ide.cursor().line).eq(0);
  });

  it("cursorPageDown near the end stops on the last line", () => {
    const ide = editor(95);

    ide.executeCommand("textEditor.cursorPageDown");

    expect(ide.cursor().line).eq(99);
  });
});

describe("revealLine", () => {
  it("puts a line at the top", () => {
    const ide = editor(0);

    ide.executeCommand("textEditor.revealLine", { lineNumber: 40, at: "top" });

    expect(ide.viewport().firstLine).eq(40);
  });

  it("centers a line", () => {
    const ide = editor(0);

    ide.executeCommand("textEditor.revealLine", { lineNumber: 40, at: "center" });

    expect(ide.viewport().firstLine).eq(40 - Math.floor(rows(ide) / 2));
  });

  it("puts a line at the bottom", () => {
    const ide = editor(0);

    ide.executeCommand("textEditor.revealLine", { lineNumber: 40, at: "bottom" });

    expect(ide.viewport().firstLine).eq(40 - rows(ide) + 1);
  });

  it("does not move the cursor", () => {
    const ide = editor(2);

    ide.executeCommand("textEditor.revealLine", { lineNumber: 40, at: "top" });

    expect(ide.cursor().line).eq(2);
  });
});

describe("cursor_surrounding_lines", () => {
  it("scrolls before the cursor reaches the bottom edge", () => {
    const ide = editor(0).setting("cursor_surrounding_lines", 3);
    const last = rows(ide) - 1;

    // the cursor may go down to 3 lines above the bottom row
    for (let i = 0; i < last - 3; i++) ide.keys("j");
    expect(ide.viewport().firstLine).eq(0);

    ide.keys("j");
    expect(ide.viewport().firstLine).eq(1);
  });

  it("scrolls before the cursor reaches the top edge", () => {
    const ide = editor(50).setting("cursor_surrounding_lines", 3);
    ide.executeCommand("textEditor.revealLine", { lineNumber: 47, at: "top" });

    ide.keys("k");

    expect(ide.cursor().line).eq(49);
    expect(ide.viewport().firstLine).eq(46);
  });

  it("is limited to half the view", () => {
    const ide = editor(0).setting("cursor_surrounding_lines", 1000);
    const half = Math.floor((rows(ide) - 1) / 2);

    for (let i = 0; i < 30; i++) ide.keys("j");

    expect(ide.cursor().line - ide.viewport().firstLine).eq(half);
  });

  it("does not apply at the start of the file", () => {
    const ide = editor(0).setting("cursor_surrounding_lines", 3);

    ide.keys("j");

    expect(ide.viewport().firstLine).eq(0);
  });
});

// what is drawn left of the text on each text row
function gutter(ide: ReturnType<typeof code>) {
  const x = ide.textArea().x;
  return ide.textRows().map((row) => row.slice(0, x).trim());
}

describe("line_numbers", () => {
  it('"off" draws no numbers', () => {
    const ide = editor(0).setting("line_numbers", "off");

    expect(gutter(ide).every((cell) => cell === "")).eq(true);
  });

  it('"relative" shows the distance, and the cursor line itself', () => {
    const ide = editor(2).setting("line_numbers", "relative");

    expect(gutter(ide).slice(0, 5)).toEqual(["2", "1", "3", "1", "2"]);
  });

  it('"interval" shows every 10th line and the cursor line', () => {
    const ide = code(at(3, 30), { width: 40, height: 30 }).setting(
      "line_numbers",
      "interval",
    );

    const numbers = gutter(ide);
    expect(numbers[3]).eq("4");
    expect(numbers[9]).eq("10");
    expect(numbers[19]).eq("20");
    expect(numbers[0]).eq("");
    expect(numbers[5]).eq("");
  });
});

describe("tab focus mode", () => {
  it("Tab types a tab by default", () => {
    const ide = code("|x").setting("expand_tab", false);

    ide.keys("i<Tab><Esc>");

    expect(ide.lines()).toEqual(["\tx"]);
  });

  it("toggleTabFocusMode flips the setting", () => {
    const ide = code("|x");

    ide.executeCommand("textEditor.toggleTabFocusMode");
    expect(ide.setting("tab_moves_focus")).eq(true);

    ide.executeCommand("textEditor.toggleTabFocusMode");
    expect(ide.setting("tab_moves_focus")).eq(false);
  });

  it("with tab focus mode Tab leaves the text alone and moves focus", () => {
    const ide = code("|x");
    const sidebar = ide.addSidebar(new UiPanel());
    const before = ide.getActiveWindow();
    ide.setting("tab_moves_focus", true);

    ide.keys("i<Tab>");

    expect(ide.lines()).toEqual(["x"]);
    expect(before).not.eq(sidebar);
    expect(ide.getActiveWindow()).eq(sidebar);
  });
});
