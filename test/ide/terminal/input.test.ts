import { describe, expect, it } from "vitest";
import { encodeKey, encodePaste, needsPasteWarning } from "../../../src/Terminal/input.js";

// What the terminal sends to the shell for each key (xterm's encoding,
// which is what VS Code's terminal uses). Proposed src/Terminal/input.ts:
//   encodeKey({ key, ctrl?, alt?, shift? }, { applicationCursorKeys? }) -> string
//     key: a character, or "Enter" "Backspace" "Tab" "Escape" "ArrowUp"
//     "Home" "End" "PageUp" "PageDown" "Insert" "Delete" "F1".."F12"
//   Modifiers on special keys use xterm's parameter 1 + shift(1) + alt(2) +
//   ctrl(4): Ctrl+Right is ESC [1;5C.
//   encodePaste(text, { bracketedPaste }) -> string: line breaks become \r;
//     with bracketed paste the text is wrapped in ESC[200~ ... ESC[201~
//   needsPasteWarning(text, { bracketedPaste, setting: "auto" | "always" |
//     "never" }) (terminal.integrated.enableMultiLinePasteWarning)

const key = (name: string, mods = {}, modes = {}) => encodeKey({ key: name, ...mods }, modes);

describe("plain keys", () => {
  it("characters are sent as they are", () => {
    expect(key("a")).eq("a");
    expect(key("A", { shift: true })).eq("A");
  });

  it("Enter, Backspace, Tab and Escape", () => {
    expect(key("Enter")).eq("\r");
    expect(key("Backspace")).eq("\x7f");
    expect(key("Tab")).eq("\t");
    expect(key("Escape")).eq("\x1b");
  });

  it("Shift+Tab", () => {
    expect(key("Tab", { shift: true })).eq("\x1b[Z");
  });
});

describe("cursor keys", () => {
  it("normal mode", () => {
    expect([key("ArrowUp"), key("ArrowDown"), key("ArrowRight"), key("ArrowLeft")]).toEqual([
      "\x1b[A",
      "\x1b[B",
      "\x1b[C",
      "\x1b[D",
    ]);
  });

  it("application mode (vim, less)", () => {
    expect(key("ArrowUp", {}, { applicationCursorKeys: true })).eq("\x1bOA");
  });

  it("Home and End", () => {
    expect(key("Home")).eq("\x1b[H");
    expect(key("End")).eq("\x1b[F");
    expect(key("Home", {}, { applicationCursorKeys: true })).eq("\x1bOH");
  });
});

describe("editing and page keys", () => {
  it("Insert, Delete, PageUp, PageDown", () => {
    expect([key("Insert"), key("Delete"), key("PageUp"), key("PageDown")]).toEqual([
      "\x1b[2~",
      "\x1b[3~",
      "\x1b[5~",
      "\x1b[6~",
    ]);
  });
});

describe("function keys", () => {
  it("F1 to F4", () => {
    expect([key("F1"), key("F2"), key("F3"), key("F4")]).toEqual(["\x1bOP", "\x1bOQ", "\x1bOR", "\x1bOS"]);
  });

  it("F5 to F12", () => {
    expect(["F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].map((f) => key(f))).toEqual([
      "\x1b[15~",
      "\x1b[17~",
      "\x1b[18~",
      "\x1b[19~",
      "\x1b[20~",
      "\x1b[21~",
      "\x1b[23~",
      "\x1b[24~",
    ]);
  });
});

describe("modifiers", () => {
  it("Ctrl+letter sends the control character", () => {
    expect(key("c", { ctrl: true })).eq("\x03");
    expect(key("a", { ctrl: true })).eq("\x01");
  });

  it("Ctrl+Space and Ctrl+[", () => {
    expect(key(" ", { ctrl: true })).eq("\x00");
    expect(key("[", { ctrl: true })).eq("\x1b");
  });

  it("Alt+key sends ESC first", () => {
    expect(key("a", { alt: true })).eq("\x1ba");
  });

  it("modified arrows", () => {
    expect(key("ArrowRight", { ctrl: true })).eq("\x1b[1;5C");
    expect(key("ArrowUp", { shift: true })).eq("\x1b[1;2A");
    expect(key("ArrowLeft", { alt: true })).eq("\x1b[1;3D");
    expect(key("ArrowRight", { ctrl: true, shift: true })).eq("\x1b[1;6C");
  });

  it("modified function keys", () => {
    expect(key("F5", { shift: true })).eq("\x1b[15;2~");
    expect(key("F1", { ctrl: true })).eq("\x1b[1;5P");
  });
});

describe("pasting", () => {
  it("line breaks become carriage returns", () => {
    expect(encodePaste("a\nb\r\nc", { bracketedPaste: false })).eq("a\rb\rc");
  });

  it("bracketed paste wraps the text", () => {
    expect(encodePaste("ls\n", { bracketedPaste: true })).eq("\x1b[200~ls\r\x1b[201~");
  });

  it("warns about a multi-line paste only without bracketed paste (auto)", () => {
    expect(needsPasteWarning("a\nb", { bracketedPaste: false, setting: "auto" })).eq(true);
    expect(needsPasteWarning("a\nb", { bracketedPaste: true, setting: "auto" })).eq(false);
    expect(needsPasteWarning("one line", { bracketedPaste: false, setting: "auto" })).eq(false);
  });

  it("always and never", () => {
    expect(needsPasteWarning("a\nb", { bracketedPaste: true, setting: "always" })).eq(true);
    expect(needsPasteWarning("a\nb", { bracketedPaste: false, setting: "never" })).eq(false);
  });
});
