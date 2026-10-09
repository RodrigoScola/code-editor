import { describe, expect, it } from "vitest";
import { VirtualTerminal } from "../../../src/Terminal/VirtualTerminal.js";

// More of the terminal emulator (the basics are in
// test/ide/tools/terminal-emulator.test.ts). Same API, plus:
//   new VirtualTerminal(cols, rows, { scrollback?, onData?, onBell? })
//     onData(reply) receives what the terminal answers (device status)
//   term.modes() -> { applicationCursorKeys, bracketedPaste, cursorVisible,
//     autoWrap, insert, alternateScreen }
//   term.cursorStyle() -> "block" | "underline" | "bar", blink
//   term.resize(cols, rows) reflows wrapped lines
//   cell.link -> the OSC 8 hyperlink on the cell, if any
//   cell.width -> 2 for the first cell of a wide character, 0 for its
//     second half

const term = (cols = 10, rows = 4, options = {}) => new VirtualTerminal(cols, rows, options);
const screen = (t: VirtualTerminal, rows: number) =>
  Array.from({ length: rows }, (_, y) => t.lineText(y));

describe("scrolling regions", () => {
  it("DECSTBM limits scrolling to the region", () => {
    const t = term(10, 4);
    t.write("top\r\n\x1b[2;3r\x1b[2;1Ha\r\nb\r\nc");

    expect(screen(t, 4)).toEqual(["top", "b", "c", ""]);
  });

  it("reverse index at the top of the screen scrolls down", () => {
    const t = term(10, 3);
    t.write("a\r\nb\x1b[H\x1bMz");

    expect(screen(t, 3)).toEqual(["z", "a", "b"]);
  });
});

describe("the alternate screen", () => {
  it("1049 switches to a clean screen and back, restoring the cursor", () => {
    const t = term(10, 3);
    t.write("main\x1b[?1049h");
    expect(t.lineText(0)).eq("");
    expect(t.modes().alternateScreen).eq(true);

    t.write("full screen app\x1b[?1049l");

    expect(t.lineText(0)).eq("main");
    expect(t.cursor()).toEqual({ x: 4, y: 0 });
  });
});

describe("saving the cursor", () => {
  it("ESC 7 and ESC 8 save and restore the position", () => {
    const t = term();
    t.write("ab\x1b7\x1b[3;5Hx\x1b8y");

    expect(t.lineText(0)).eq("aby");
  });

  it("CSI s and CSI u do the same", () => {
    const t = term();
    t.write("ab\x1b[s\x1b[3;5Hx\x1b[uy");

    expect(t.lineText(0)).eq("aby");
  });
});

describe("inserting and deleting", () => {
  it("IL inserts blank lines at the cursor", () => {
    const t = term(10, 3);
    t.write("a\r\nb\r\nc\x1b[2;1H\x1b[L");

    expect(screen(t, 3)).toEqual(["a", "", "b"]);
  });

  it("DL deletes lines at the cursor", () => {
    const t = term(10, 3);
    t.write("a\r\nb\r\nc\x1b[1;1H\x1b[M");

    expect(screen(t, 3)).toEqual(["b", "c", ""]);
  });

  it("ICH inserts blank characters", () => {
    const t = term();
    t.write("abc\x1b[1;2H\x1b[2@");

    expect(t.lineText(0)).eq("a  bc");
  });

  it("DCH deletes characters", () => {
    const t = term();
    t.write("abcde\x1b[1;2H\x1b[2P");

    expect(t.lineText(0)).eq("ade");
  });

  it("ECH erases characters without moving the rest", () => {
    const t = term();
    t.write("abcde\x1b[1;2H\x1b[2X");

    expect(t.lineText(0)).eq("a  de");
  });

  it("insert mode pushes text right", () => {
    const t = term();
    t.write("abc\x1b[1;2H\x1b[4hX");

    expect(t.lineText(0)).eq("aXbc");
  });
});

describe("erasing", () => {
  it("EL 1 erases to the start of the line, EL 2 the whole line", () => {
    const one = term();
    one.write("abcdef\x1b[1;3H\x1b[1K");
    const two = term();
    two.write("abcdef\x1b[2K");

    expect(one.lineText(0)).eq("   def");
    expect(two.lineText(0)).eq("");
  });

  it("ED 1 erases from the start of the screen to the cursor", () => {
    const t = term(10, 3);
    t.write("aaa\r\nbbb\r\nccc\x1b[2;2H\x1b[1J");

    expect(screen(t, 3)).toEqual(["", "  b", "ccc"]);
  });

  it("ED 3 clears the scrollback", () => {
    const t = term(10, 2);
    t.write("a\r\nb\r\nc\x1b[3J");

    expect(t.scrollback()).toEqual([]);
  });
});

describe("cursor movement", () => {
  it("CHA moves to a column, VPA to a row", () => {
    const t = term();
    t.write("\x1b[5GX\x1b[3dY");

    expect(t.cell(4, 0).char).eq("X");
    expect(t.cell(5, 2).char).eq("Y");
  });

  it("CNL and CPL move down and up to column 0", () => {
    const t = term();
    t.write("abc\x1b[2Ex\x1b[1Fy");

    expect(screen(t, 3)).toEqual(["abc", "y", "x"]);
  });

  it("CUP without numbers goes home", () => {
    const t = term();
    t.write("abc\x1b[Hz");

    expect(t.lineText(0)).eq("zbc");
  });
});

describe("tab stops", () => {
  it("HTS sets a tab stop and TBC clears them all", () => {
    const t = term(20, 2);
    t.write("\x1b[3g\x1b[1;4H\x1bH\r\tx");

    expect(t.cell(3, 0).char).eq("x");
  });
});

describe("line wrapping mode", () => {
  it("with autowrap off, the last column is overwritten", () => {
    const t = term(4, 2);
    t.write("\x1b[?7labcdef");

    expect(screen(t, 2)).toEqual(["abcf", ""]);
  });
});

describe("character sets and widths", () => {
  it("DEC line drawing turns letters into box characters", () => {
    const t = term();
    t.write("\x1b(0lqk\x1b(Bq");

    expect(t.lineText(0)).eq("┌─┐q");
  });

  it("a wide character takes two cells", () => {
    const t = term();
    t.write("你a");

    expect(t.cell(0, 0)).toMatchObject({ char: "你", width: 2 });
    expect(t.cell(1, 0).width).eq(0);
    expect(t.cell(2, 0).char).eq("a");
    expect(t.cursor().x).eq(3);
  });

  it("a combining mark joins the character before it", () => {
    const t = term();
    t.write("éx");

    expect(t.cell(0, 0).char).eq("é");
    expect(t.cell(1, 0).char).eq("x");
  });
});

describe("more SGR", () => {
  it("dim, italic, strikethrough and invisible", () => {
    const t = term();
    t.write("\x1b[2;3;9;8mX");

    expect(t.cell(0, 0)).toMatchObject({ dim: true, italic: true, strikethrough: true, invisible: true });
  });

  it("22 turns bold and dim off, 23 italic, 29 strikethrough", () => {
    const t = term();
    t.write("\x1b[1;2;3;9mA\x1b[22;23;29mB");

    expect(t.cell(1, 0)).toMatchObject({ bold: false, dim: false, italic: false, strikethrough: false });
  });

  it("bright backgrounds and default colors", () => {
    const t = term();
    t.write("\x1b[31;103mA\x1b[39;49mB");

    expect(t.cell(0, 0)).toMatchObject({ fg: 1, bg: 11 });
    expect(t.cell(1, 0)).toMatchObject({ fg: null, bg: null });
  });

  it("the colon form of true color", () => {
    const t = term();
    t.write("\x1b[38:2::1:2:3mA");

    expect(t.cell(0, 0).fg).eq("#010203");
  });
});

describe("resizing", () => {
  it("rejoins wrapped lines when the terminal gets wider", () => {
    const t = term(4, 3);
    t.write("abcdef");

    t.resize(8, 3);

    expect(t.lineText(0)).eq("abcdef");
  });

  it("wraps long lines when it gets narrower", () => {
    const t = term(8, 3);
    t.write("abcdef");

    t.resize(4, 3);

    expect(screen(t, 2)).toEqual(["abcd", "ef"]);
  });
});

describe("scrollback limit", () => {
  it("keeps only the newest lines", () => {
    const t = term(10, 1, { scrollback: 2 });
    t.write("1\r\n2\r\n3\r\n4");

    expect(t.scrollback()).toEqual(["2", "3"]);
  });
});

describe("replies and events", () => {
  it("answers a cursor position request", () => {
    const replies: string[] = [];
    const t = term(10, 4, { onData: (data: string) => replies.push(data) });

    t.write("ab\x1b[6n");

    expect(replies).toEqual(["\x1b[1;3R"]);
  });

  it("answers a device attributes request", () => {
    const replies: string[] = [];
    const t = term(10, 4, { onData: (data: string) => replies.push(data) });

    t.write("\x1b[c");

    expect(replies[0]).toMatch(/^\x1b\[\?/);
  });

  it("rings the bell", () => {
    let bells = 0;
    const t = term(10, 4, { onBell: () => bells++ });

    t.write("a\x07b\x07");

    expect(bells).eq(2);
    expect(t.lineText(0)).eq("ab");
  });
});

describe("modes", () => {
  it("tracks application cursor keys, bracketed paste and cursor visibility", () => {
    const t = term();
    t.write("\x1b[?1h\x1b[?2004h\x1b[?25l");

    expect(t.modes()).toMatchObject({
      applicationCursorKeys: true,
      bracketedPaste: true,
      cursorVisible: false,
    });

    t.write("\x1b[?1l\x1b[?2004l\x1b[?25h");
    expect(t.modes()).toMatchObject({
      applicationCursorKeys: false,
      bracketedPaste: false,
      cursorVisible: true,
    });
  });

  it("DECSCUSR sets the cursor style", () => {
    const t = term();

    t.write("\x1b[2 q");
    expect(t.cursorStyle()).toEqual({ shape: "block", blink: false });

    t.write("\x1b[5 q");
    expect(t.cursorStyle()).toEqual({ shape: "bar", blink: true });

    t.write("\x1b[4 q");
    expect(t.cursorStyle()).toEqual({ shape: "underline", blink: false });
  });
});

describe("hyperlinks (OSC 8)", () => {
  it("marks the linked cells", () => {
    const t = term(20, 2);
    t.write("\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\ x");

    expect(t.cell(0, 0).link).eq("https://example.com");
    expect(t.cell(3, 0).link).eq("https://example.com");
    expect(t.cell(5, 0).link).toBeUndefined();
    expect(t.lineText(0)).eq("link x");
  });

  it("accepts BEL as the terminator", () => {
    const t = term(20, 2);
    t.write("\x1b]8;;https://a.b\x07go\x1b]8;;\x07");

    expect(t.cell(0, 0).link).eq("https://a.b");
  });
});
