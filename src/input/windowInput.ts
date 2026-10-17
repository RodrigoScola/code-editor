// key is SDL's virtual key: the character the key types without Shift, or

import { InputParser } from "./InputParser.js";

// a name ("escape", "return", "left", ...)
export type WindowKeyDown = {
  type: "keyDown";
  key: string | null;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  repeat: boolean;
};

export type WindowTextInput = { type: "textInput"; text: string };

export type WindowInputEvent = WindowKeyDown | WindowTextInput;

export class WindowInputParser {
  static FromKeyDown(input: WindowKeyDown): KeyEvent[] {
    const key = input.key || "";
    console.log(input.ctrl, input.alt);
    if (
      input.ctrl == false &&
      input.alt === false &&
      (InputParser.isCharacter(key) ||
        InputParser.IsDigit(key) ||
        !InputParser.isSpecialToken(key) ||
        InputParser.isSpace(key))
    ) {
      return [];
    }

    return [
      {
        token: InputParser.ToToken(key),
        alt: input.alt,
        ctrl: input.ctrl,
        shift: input.shift,
      },
    ];
  }
  static FromTextInput(input: WindowTextInput): KeyEvent[] {
    const keys = Array.from(input.text);
    console.log(input);

    const event: KeyEvent[] = [];

    for (const key of keys) {
      const evt: KeyEvent = {
        alt: false,
        ctrl: false,
        token: key,
        shift: false,
      };
      if (InputParser.isCharacter(key)) {
        evt.shift = key.toUpperCase() === key;
      }

      event.push(evt);
    }

    return event;
  }
  // the KeyEvents one window event stands for; a key that types a character
  // sends keyDown and then textInput, and only textInput types it
  static Parse(event: WindowInputEvent): KeyEvent[] {
    switch (event.type) {
      case "textInput":
        return WindowInputParser.FromTextInput(event);
      case "keyDown":
        return WindowInputParser.FromKeyDown(event);
      default:
        throw new Error(`input type: ${event}  invalid`);
    }
  }
}
