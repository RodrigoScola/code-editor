import { CommandMode, InsertMode, NormalMode } from "../Commands/Commands.js";
import { WINDOW_NAMES } from "../constants.js";
import { isTextEditor } from "../utils.js";

export class EditorContext {
  activeWindow: Component | null = null;
  rootWindow: Component | null = null;
  normalMode: NormalMode = new NormalMode();
  insertMode: InsertMode = new InsertMode();
  commandMode: CommandMode = new CommandMode();
  mode: EditorMode = this.normalMode;
  modeName: EditingModes = "normal";

  constructor() {}

  handleKey(key: KeyEvent) {
    if (!key.token) {
      return;
    }
    this.mode.handleKey(key, this);
  }
  getActiveTextEditor() {
    const textEditorWindow = this.rootWindow?.findChildrenByName(
      WINDOW_NAMES.EDITOR_TEXT_WINDOW,
    );

    isTextEditor(textEditorWindow);
    return textEditorWindow;
  }
  setMode(m: EditingModes) {
    this.modeName = m;
    if (m === "normal") {
      this.mode = this.normalMode;
      const textEditorWindow = this.rootWindow?.findChildrenByName(
        WINDOW_NAMES.EDITOR_TEXT_WINDOW,
      );

      this.activeWindow = textEditorWindow
        ? textEditorWindow
        : this.activeWindow;
    } else if (m === "insert") {
      this.mode = this.insertMode;
    } else if (m === "command") {
      this.mode = this.commandMode;
      const statusWindow = this.rootWindow?.findChildrenByName(
        WINDOW_NAMES.STATUS_WINDOW,
      );
      this.activeWindow = statusWindow ? statusWindow : this.activeWindow;
    } else {
      throw new Error(`mode: ${m} has not been made yet`);
    }
    this.activeWindow?.onEvent({ name: "editorModeChange", mode: m });
  }
}
