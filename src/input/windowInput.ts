import type { KeyEvent } from "./inputParser.js";

// key is SDL's virtual key: the character the key types without Shift, or
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
  // the KeyEvents one window event stands for; a key that types a character
  // sends keyDown and then textInput, and only textInput types it
  static parse(event: WindowInputEvent): KeyEvent[] {
    throw new Error("not implemented");
  }
}
