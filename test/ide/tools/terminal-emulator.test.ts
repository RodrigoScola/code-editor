import { describe, expect, it } from "vitest";
import { VirtualTerminal } from "../../../src/Terminal/VirtualTerminal.js";

// Proposed module src/Terminal/VirtualTerminal.ts: the screen model behind
// an integrated terminal panel. A shell (through a pty) writes bytes, this
// turns them into a grid of cells the UI can draw.
//
//   new VirtualTerminal(cols, rows)
//   term.write(string | Uint8Array)   escape sequences and UTF-8 may be cut
//                                     anywhere between writes
//   term.lineText(y)                  the row's characters, right-trimmed
//   term.cell(x, y) -> { char, fg, bg, bold, underline, inverse }
//     colors: null (default), 0-255 (palette; 0-7 normal, 8-15 bright),
//             or "#rrggbb"
//   term.cursor() -> { x, y }
//   term.scrollback() -> lines that scrolled off the top
//   term.title()                      set by OSC 0 / OSC 2

const term = (cols = 10, rows = 3) => new VirtualTerminal(cols, rows);

describe("text", () => {
  it("writes characters and moves the cursor", () => {
    const t = term();
    t.write("ab");

    expect(t.lineText(0)).eq("ab");
    expect(t.cursor()).toEqual({ x: 2, y: 0 });
  });

  it("\\r\\n goes to the start of the next line", () => {
    const t = term();
    t.write("ab\r\ncd");

    expect([t.lineText(0), t.lineText(1)]).toEqual(["ab", "cd"]);
  });

  it("\\n alone goes down but keeps the column", () => {
    const t = term();
    t.write("ab\ncd");

    expect(t.lineText(1)).eq("  cd");
  });

  it("wraps at the right edge", () => {
    const t = term(4, 3);
    t.write("abcdef");

    expect([t.lineText(0), t.lineText(1)]).toEqual(["abcd", "ef"]);
  });

  it("scrolls when the output goes past the last row", () => {
    const t = term(10, 2);
    t.write("a\r\nb\r\nc");

    expect([t.lineText(0), t.lineText(1)]).toEqual(["b", "c"]);
    expect(t.scrollback()).toEqual(["a"]);
  });

  it("\\b moves back so the next character overwrites", () => {
    const t = term();
    t.write("ab\bc");

    expect(t.lineText(0)).eq("ac");
  });

  it("\\t goes to the next multiple of 8", () => {
    const t = term(20, 2);
    t.write("a\tb");

    expect(t.cell(8, 0).char).eq("b");
  });

  it("puts together UTF-8 split between writes", () => {
    const t = term();
    const bytes = new TextEncoder().encode("é");
    t.write(bytes.slice(0, 1));
    t.write(bytes.slice(1));

    expect(t.lineText(0)).eq("é");
  });
});

describe("colors and styles (SGR)", () => {
  it("sets and resets the foreground", () => {
    const t = term();
    t.write("\x1b[31mR\x1b[0mN");

    expect(t.cell(0, 0).fg).eq(1);
    expect(t.cell(1, 0).fg).toBeNull();
  });

  it("knows bright colors", () => {
    const t = term();
    t.write("\x1b[91mR");

    expect(t.cell(0, 0).fg).eq(9);
  });

  it("knows 256 colors and true color", () => {
    const t = term();
    t.write("\x1b[38;5;208mA\x1b[48;2;1;2;3mB");

    expect(t.cell(0, 0).fg).eq(208);
    expect(t.cell(1, 0).bg).eq("#010203");
  });

  it("sets bold, underline and inverse", () => {
    const t = term();
    t.write("\x1b[1;4;7mX");

    expect(t.cell(0, 0)).toMatchObject({ bold: true, underline: true, inverse: true });
  });

  it("handles an escape sequence cut between writes", () => {
    const t = term();
    t.write("\x1b[3");
    t.write("1mR");

    expect(t.cell(0, 0).fg).eq(1);
    expect(t.lineText(0)).eq("R");
  });
});

describe("cursor movement and erasing (CSI)", () => {
  it("ESC[row;colH moves the cursor (1-based)", () => {
    const t = term();
    t.write("\x1b[2;3HX");

    expect(t.cell(2, 1).char).eq("X");
  });

  it("ESC[K erases to the end of the line", () => {
    const t = term();
    t.write("abcdef\x1b[1;3H\x1b[K");

    expect(t.lineText(0)).eq("ab");
  });

  it("ESC[2J clears the screen", () => {
    const t = term();
    t.write("ab\r\ncd\x1b[2J");

    expect([t.lineText(0), t.lineText(1)]).toEqual(["", ""]);
  });

  it("ESC[A ESC[B ESC[C ESC[D move by one", () => {
    const t = term();
    t.write("\x1b[2;2H\x1b[A\x1b[C");

    expect(t.cursor()).toEqual({ x: 2, y: 0 });
  });
});

describe("other sequences", () => {
  it("OSC 0 sets the title and prints nothing", () => {
    const t = term();
    t.write("\x1b]0;my shell\x07ok");

    expect(t.title()).eq("my shell");
    expect(t.lineText(0)).eq("ok");
  });

  it("ignores sequences it doesn't know without printing them", () => {
    const t = term();
    t.write("\x1b[?2004hok");

    expect(t.lineText(0)).eq("ok");
  });
});
