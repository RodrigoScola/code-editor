import { describe, expect, it } from "vitest";
import { VirtualTerminal } from "../../../src/Terminal/VirtualTerminal.js";
import { serializeTerminal, shouldRevive } from "../../../src/Terminal/persistence.js";

// Terminals that survive a restart (VS Code:
// terminal.integrated.enablePersistentSessions,
// persistentSessionReviveProcess, persistentSessionScrollback).
// What was on screen is saved as escape sequences; writing them into a new
// terminal draws the same screen again, then a new shell starts below.
//
// Proposed src/Terminal/persistence.ts:
//   serializeTerminal(term, { scrollback = 100 }) -> string
//     the screen, its colors and styles, the cursor position and at most
//     `scrollback` lines of scrollback, as text a VirtualTerminal can replay
//   shouldRevive(settings, reason) -> boolean
//     settings: { enablePersistentSessions, reviveProcess:
//       "onExit" | "onExitAndWindowClose" | "never" }
//     reason: "reload" (the editor restarted itself) | "quit" | "windowClose"
//     reload revives whenever persistent sessions are on; quit with
//     "onExit" or "onExitAndWindowClose"; windowClose only with
//     "onExitAndWindowClose"; never without persistent sessions

// writes the saved text into a new terminal of the same size
function replay(term: VirtualTerminal, options?: { scrollback?: number }) {
  const copy = new VirtualTerminal(20, 5);
  copy.write(serializeTerminal(term, options));
  return copy;
}

const screen = (term: VirtualTerminal) => Array.from({ length: 5 }, (_, y) => term.lineText(y));

describe("serializing a terminal", () => {
  it("brings back the text", () => {
    const term = new VirtualTerminal(20, 5);
    term.write("$ ls\r\na.txt  b.txt\r\n$ ");

    expect(screen(replay(term))).toEqual(screen(term));
  });

  it("brings back the cursor position", () => {
    const term = new VirtualTerminal(20, 5);
    term.write("$ ls\r\n$ echo hi");
    term.write("\x1b[3D"); // three to the left

    expect(replay(term).cursor()).toEqual(term.cursor());
  });

  it("brings back colors and styles", () => {
    const term = new VirtualTerminal(20, 5);
    term.write("\x1b[1;31merror\x1b[0m ok \x1b[38;2;1;2;3mrgb\x1b[0m");

    const copy = replay(term);
    expect(copy.cell(0, 0)).toMatchObject({ char: "e", fg: 1, bold: true });
    expect(copy.cell(6, 0)).toMatchObject({ char: "o", fg: null, bold: false });
    expect(copy.cell(9, 0)).toMatchObject({ char: "r", fg: "#010203" });
  });

  it("does not leave styles switched on after the screen", () => {
    const term = new VirtualTerminal(20, 5);
    term.write("\x1b[4munderlined");

    const copy = replay(term);
    copy.write("\r\nplain");
    expect(copy.cell(0, 1).underline).eq(false);
  });

  it("brings back scrollback, up to the limit", () => {
    const term = new VirtualTerminal(20, 5);
    for (let i = 0; i < 30; i++) term.write(`line ${i}\r\n`);

    const copy = replay(term, { scrollback: 10 });
    expect(screen(copy)).toEqual(screen(term));
    expect(copy.scrollback()).length(10);
    expect(copy.scrollback().at(-1)).eq(term.scrollback().at(-1));
  });

  it("keeps a wrapped line as one line", () => {
    const term = new VirtualTerminal(20, 5);
    term.write("x".repeat(25));

    const copy = new VirtualTerminal(40, 5);
    copy.write(serializeTerminal(term));
    expect(copy.lineText(0)).eq("x".repeat(25));
  });

  it("saves the normal screen, not a full-screen program's", () => {
    const term = new VirtualTerminal(20, 5);
    term.write("$ vim\r\n");
    term.write("\x1b[?1049h~ vim screen");

    expect(replay(term).lineText(0)).eq("$ vim");
  });

  it("an empty terminal saves to almost nothing", () => {
    expect(serializeTerminal(new VirtualTerminal(20, 5)).length).toBeLessThan(20);
  });
});

describe("when to revive", () => {
  const on = (reviveProcess: string) => ({ enablePersistentSessions: true, reviveProcess });

  it.each([
    ["onExit", "reload", true],
    ["onExit", "quit", true],
    ["onExit", "windowClose", false],
    ["onExitAndWindowClose", "quit", true],
    ["onExitAndWindowClose", "windowClose", true],
    ["never", "reload", true],
    ["never", "quit", false],
    ["never", "windowClose", false],
  ])("%s after %s: %s", (policy, reason, expected) => {
    expect(shouldRevive(on(policy), reason as "reload")).eq(expected);
  });

  it("nothing is revived without persistent sessions", () => {
    const off = { enablePersistentSessions: false, reviveProcess: "onExitAndWindowClose" };

    expect(shouldRevive(off, "reload")).eq(false);
    expect(shouldRevive(off, "quit")).eq(false);
  });
});
