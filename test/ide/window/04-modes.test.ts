import { describe, expect, it } from "vitest";
import { vim } from "../harness.js";
import type { EditorContext } from "../../../src/Editor/EditorContext.js";
import type { EditorCommand } from "../../../src/Commands/Commands.js";
import {
  WindowInputParser,
  type WindowInputEvent,
  type WindowKeyDown,
} from "../../../src/Input/window/windowInput.js";
import { keyFor } from "./helpers.js";

// Level 4: the editor's modes driven by window events. Same parser as level
// 3, now feeding a real editor (test/ide/harness.ts) through
// ide.handleKey(), the way index.ts feeds it terminal keys. Nothing new to
// build if level 3 passes; this proves the keys mean the right thing to
// normal, insert and command mode: nothing typed twice, Shift symbols work,
// <Esc> and <CR> arrive.
//
// Each event list is what a real keyboard sends: typing("iX") is keyDown i,
// textInput i, keyDown x (Shift), textInput X.

function keyDown(
  key: string,
  modifiers: Partial<Omit<WindowKeyDown, "type" | "key">> = {},
): WindowKeyDown {
  return {
    type: "keyDown",
    key,
    shift: false,
    ctrl: false,
    alt: false,
    repeat: false,
    ...modifiers,
  };
}

function typing(text: string): WindowInputEvent[] {
  const events: WindowInputEvent[] = [];
  for (const ch of text) {
    const { key, shift } = keyFor(ch);
    events.push(keyDown(key, { shift }));
    events.push({ type: "textInput", text: ch });
  }
  return events;
}

const ESC = keyDown("escape");
const ENTER = keyDown("return");
const BACKSPACE = keyDown("backspace");

// sends window events to the editor, as the window does once connected
function press(ide: EditorContext, ...events: WindowInputEvent[]) {
  for (const event of events) {
    for (const key of WindowInputParser.Parse(event)) {
      ide.handleKey(key);
    }
  }
  return ide;
}

describe("normal mode", () => {
  it("j moves down", () => {
    expect(press(vim("|a\nb"), ...typing("j")).cursor().line).eq(1);
  });

  it("l moves right", () => {
    expect(press(vim("|abc"), ...typing("l")).text()).eq("a|bc");
  });

  it("dd deletes the line (two keys, one command)", () => {
    expect(press(vim("a\n|b\nc"), ...typing("dd")).text()).eq("a\n|c");
  });

  it("gg goes to the first line", () => {
    expect(press(vim("a\nb\n|c"), ...typing("gg")).text()).eq("|a\nb\nc");
  });

  it("$ (Shift+4) goes to the end of the line", () => {
    expect(press(vim("|abc"), ...typing("$")).text()).eq("ab|c");
  });

  it("W (Shift) jumps over punctuation to the next word", () => {
    expect(press(vim("|foo.x bar"), ...typing("W")).text()).eq("foo.x |bar");
  });

  it("v starts visual mode", () => {
    expect(press(vim("|abc"), ...typing("v")).mode()).eq("visual");
  });

  it("<Esc> in normal mode stays in normal mode and changes nothing", () => {
    const ide = press(vim("a|bc"), ESC);

    expect(ide.mode()).eq("normal");
    expect(ide.text()).eq("a|bc");
  });
});

// these check the lines, not where <Esc> leaves the cursor: that is insert
// mode's own spec (test/ide/vim/insert-mode.test.ts), the same for both
describe("insert mode", () => {
  it("i enters insert mode", () => {
    expect(press(vim("|abc"), ...typing("i")).mode()).eq("insert");
  });

  it("typed text goes in once, and <Esc> leaves", () => {
    const ide = press(vim("a|bc"), ...typing("iX"), ESC);

    expect(ide.lines()).toEqual(["aXbc"]);
    expect(ide.mode()).eq("normal");
  });

  it("a whole word", () => {
    expect(press(vim("|"), ...typing("ihello"), ESC).lines()).toEqual([
      "hello",
    ]);
  });

  it("upper-case letters and symbols typed with Shift", () => {
    expect(press(vim("|"), ...typing("i(Foo);"), ESC).lines()).toEqual([
      "(Foo);",
    ]);
  });

  it("a space", () => {
    expect(press(vim("a|b"), ...typing("i "), ESC).lines()).toEqual(["a b"]);
  });

  it("<BS> deletes the character before the cursor", () => {
    expect(press(vim("ab|"), ...typing("i"), BACKSPACE, ESC).lines()).toEqual([
      "a",
    ]);
  });

  it("holding <BS> keeps deleting", () => {
    const held = keyDown("backspace", { repeat: true });

    expect(
      press(vim("abc|"), ...typing("i"), BACKSPACE, held, ESC).lines(),
    ).toEqual(["a"]);
  });

  it("<CR> splits the line", () => {
    expect(press(vim("ab|cd"), ...typing("i"), ENTER, ESC).lines()).toEqual([
      "ab",
      "cd",
    ]);
  });

  it("<Left> moves without leaving insert mode", () => {
    const ide = press(
      vim("ab|"),
      ...typing("i"),
      keyDown("left"),
      ...typing("X"),
    );

    expect(ide.mode()).eq("insert");
    expect(ide.lines()).toEqual(["aXb"]);
  });

  it("normal-mode keys typed in insert mode are text", () => {
    expect(press(vim("|"), ...typing("ijjdd"), ESC).lines()).toEqual(["jjdd"]);
  });
});

describe("command mode", () => {
  // a command bound to :hello, so a spec can see that <CR> ran it
  function withHello() {
    const ide = vim("|abc");
    let runs = 0;
    const hello: EditorCommand = {
      id: "test.hello",
      title: "Test: Hello",
      description: "Counts how often it ran (:hello).",
      run: () => {
        runs++;
      },
    };
    ide.commandMode.bind("hello", hello);
    return { ide, runs: () => runs };
  }

  it(": (Shift+;) enters command mode", () => {
    expect(press(vim("|abc"), ...typing(":")).mode()).eq("command");
  });

  it("<CR> runs the typed command and goes back to normal mode", () => {
    const { ide, runs } = withHello();
    press(ide, ...typing(":hello"), ENTER);

    expect(runs()).eq(1);
    expect(ide.mode()).eq("normal");
  });

  it("<BS> fixes a typo before running it", () => {
    const { ide, runs } = withHello();
    press(ide, ...typing(":helx"), BACKSPACE, ...typing("lo"), ENTER);

    expect(runs()).eq(1);
  });

  it("<Esc> leaves without running it", () => {
    const { ide, runs } = withHello();
    press(ide, ...typing(":hello"));
    expect(ide.mode()).eq("command");

    press(ide, ESC);

    expect(runs()).eq(0);
    expect(ide.mode()).eq("normal");
  });

  it("the typed command doesn't touch the document", () => {
    const { ide } = withHello();
    press(ide, ...typing(":hello"), ENTER);

    expect(ide.lines()).toEqual(["abc"]);
  });
});
