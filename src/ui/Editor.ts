import readline from "node:readline";
import {
  InsertMode,
  KeyMapCommands,
  NormalMode,
} from "../Commands/Commands.js";
import { DisplayComponent } from "./components.js";
import { EditorComponent } from "./EditorComponent.js";

export class EditorContext {
  activeWindow: DisplayComponent | null = null;
  normalMode: NormalMode = new NormalMode();
  insertMode: InsertMode = new InsertMode();
  mode: EditorMode = this.normalMode;

  constructor() {}

  handleKey(key: readline.Key) {
    if (!key.sequence) {
      return;
    }
    this.mode.handleKey(key.sequence, this);
  }
  setMode(m: EditingModes) {
    if (m === "normal") {
      this.mode = this.normalMode;
    } else if (m === "insert") {
      this.mode = this.insertMode;
    } else {
      throw new Error(`mode: ${m} has not been made yet`);
    }
  }
}
