import { describe, expect, it } from "vitest";
import { parseKeys } from "../../../src/Input/keyNotation.js";
import {
  WindowInputParser,
  type WindowInputEvent,
  type WindowKeyDown,
  type WindowTextInput,
} from "../../../src/Input/windowInput.js";

// Level 3: turning window keyboard events into the editor's key events.
// WindowInputParser.parse(event) is the window's InputParser.parse: it
// returns the KeyEvents ({ token, ctrl, alt, shift }) one event stands for,
// the same ones the terminal makes for the same keys.
//
// The events (src/Input/windowInput.ts exports these types):
//
//   type WindowKeyDown   = { type: "keyDown"; key: string | null;
//                            shift: boolean; ctrl: boolean; alt: boolean;
//                            repeat: boolean };
//   type WindowTextInput = { type: "textInput"; text: string };
//   type WindowInputEvent = WindowKeyDown | WindowTextInput;
//
// key is SDL's virtual key: the character the key types without Shift ("a",
// ";", "9"), or a name ("escape", "return", "left", "pageUp", "shift", ...;
// full list in node_modules/@kmamal/sdl/README.md, "Virtual keys").
//
// The rule that makes it work: a key that types a character sends keyDown
// AND then textInput. Characters come from textInput only, so keyDown of a
// typing key is []; otherwise every letter would be typed twice. Keys that
// don't type (Escape, Enter, arrows) and Ctrl/Alt combinations only send
// keyDown, so those come from keyDown.
//
// Expected keys are written in Vim notation where it can say them:
// parseKeys("<C-w>") is Ctrl+w. Pure function: no window, no editor.

const parse = (event: WindowInputEvent) => WindowInputParser.Parse(event);

function keyDown(
  key: string | null,
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

function textInput(text: string): WindowTextInput {
  return { type: "textInput", text };
}

// a KeyEvent written out, for what Vim notation has no way to say
function key(
  token: string,
  modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {},
) {
  return {
    token,
    ctrl: modifiers.ctrl ?? false,
    alt: modifiers.alt ?? false,
    shift: modifiers.shift ?? false,
  };
}

describe("characters come from textInput", () => {
  it("a lower-case letter", () => {
    expect(parse(textInput("a"))).toEqual(parseKeys("a"));
  });

  it("an upper-case letter has shift: true, as the terminal reports it", () => {
    expect(parse(textInput("X"))).toEqual(parseKeys("X"));
  });

  it("a digit", () => {
    expect(parse(textInput("7"))).toEqual(parseKeys("7"));
  });

  it("a symbol typed with Shift is the symbol, with shift: false", () => {
    expect(parse(textInput(":"))).toEqual(parseKeys(":"));
  });

  it("a space is the space token", () => {
    expect(parse(textInput(" "))).toEqual(parseKeys("<Space>"));
  });

  it("< is just <, not the start of a key name", () => {
    expect(parse(textInput("<"))).toEqual([key("<")]);
  });

  it("text with several characters (a paste, an input method) is one key per character", () => {
    expect(parse(textInput("ab"))).toEqual(parseKeys("ab"));
  });

  it("a letter outside A-Z is typed as it is, without shift", () => {
    expect(parse(textInput("é"))).toEqual([key("é")]);
    expect(parse(textInput("Ä"))).toEqual([key("Ä")]);
  });

  it("an emoji is one key, not two halves", () => {
    expect(parse(textInput("😀"))).toEqual([key("😀")]);
  });

  it("empty text is nothing", () => {
    expect(parse(textInput(""))).toEqual([]);
  });

  it("each call returns new key objects", () => {
    const first = parse(textInput("a"));
    first[0].token = "changed";

    expect(parse(textInput("a"))).toEqual(parseKeys("a"));
  });
});

describe("keyDown of a key that types is left to its textInput", () => {
  it("a letter", () => {
    expect(parse(keyDown("a"))).toEqual([]);
  });

  it("a letter with Shift", () => {
    expect(parse(keyDown("x", { shift: true }))).toEqual([]);
  });

  it("a digit", () => {
    expect(parse(keyDown("7"))).toEqual([]);
  });

  it("a symbol with Shift (: is Shift+;)", () => {
    expect(parse(keyDown(";", { shift: true }))).toEqual([]);
  });

  it("space", () => {
    expect(parse(keyDown("space"))).toEqual([]);
  });

  it("a held letter (textInput repeats too)", () => {
    expect(parse(keyDown("a", { repeat: true }))).toEqual([]);
  });
});

describe("named keys come from keyDown", () => {
  it.each([
    ["escape", "<Esc>"],
    ["return", "<CR>"],
    ["enter", "<CR>"], // the keypad's Enter
    ["backspace", "<BS>"],
    ["delete", "<Del>"],
    ["tab", "<Tab>"],
    ["up", "<Up>"],
    ["down", "<Down>"],
    ["left", "<Left>"],
    ["right", "<Right>"],
    ["home", "<Home>"],
    ["end", "<End>"],
    ["pageUp", "<PageUp>"],
    ["pageDown", "<PageDown>"],
  ])("%s is %s", (name, notation) => {
    expect(parse(keyDown(name))).toEqual(parseKeys(notation));
  });

  it("a held key repeats: every repeat is the key again", () => {
    expect(parse(keyDown("backspace", { repeat: true }))).toEqual(
      parseKeys("<BS>"),
    );
  });

  it("Shift with an arrow keeps shift (it selects)", () => {
    expect(parse(keyDown("right", { shift: true }))).toEqual(
      parseKeys("<S-Right>"),
    );
  });

  it("Shift with Home keeps shift", () => {
    expect(parse(keyDown("home", { shift: true }))).toEqual(
      parseKeys("<S-Home>"),
    );
  });

  it("Shift+Tab keeps shift", () => {
    expect(parse(keyDown("tab", { shift: true }))).toEqual(
      parseKeys("<S-Tab>"),
    );
  });

  it("Ctrl with an arrow keeps ctrl", () => {
    expect(parse(keyDown("left", { ctrl: true }))).toEqual([
      key("<Left>", { ctrl: true }),
    ]);
  });
});

// Ctrl and Alt combinations don't send textInput, so keyDown has to make them
describe("Ctrl and Alt come from keyDown", () => {
  it("Ctrl with a letter", () => {
    expect(parse(keyDown("w", { ctrl: true }))).toEqual(parseKeys("<C-w>"));
  });

  it("Ctrl with another letter", () => {
    expect(parse(keyDown("b", { ctrl: true }))).toEqual(parseKeys("<C-b>"));
  });

  it("Ctrl with Shift and a letter keeps both", () => {
    expect(parse(keyDown("p", { ctrl: true, shift: true }))).toEqual([
      key("p", { ctrl: true, shift: true }),
    ]);
  });

  it("Ctrl with a symbol", () => {
    expect(parse(keyDown("]", { ctrl: true }))).toEqual([
      key("]", { ctrl: true }),
    ]);
  });

  it("Alt with a letter", () => {
    expect(parse(keyDown("x", { alt: true }))).toEqual([
      key("x", { alt: true }),
    ]);
  });

  it("Ctrl+Space is a space with ctrl", () => {
    expect(parse(keyDown("space", { ctrl: true }))).toEqual([
      key(" ", { ctrl: true }),
    ]);
  });
});

describe("keys that are nothing on their own", () => {
  it.each(["shift", "ctrl", "alt", "gui", "capsLock", "numlock"])(
    "%s",
    (name) => {
      expect(parse(keyDown(name))).toEqual([]);
    },
  );

  it("a key without a virtual key (key: null)", () => {
    expect(parse(keyDown(null))).toEqual([]);
  });

  it("a named key the editor has no token for (F5, volumeUp)", () => {
    expect(parse(keyDown("f5"))).toEqual([]);
    expect(parse(keyDown("volumeUp"))).toEqual([]);
  });
});
