import { WINDOW_NAMES } from "./constants.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { TextEditorWindow } from "./Editor/windows/TextEditorWindow.js";

export function isTextEditor(
  t: Component | undefined | null,
): asserts t is TextEditorWindow {
  if (t?.name() !== WINDOW_NAMES.EDITOR_TEXT_WINDOW) {
    throw new Error("Expected an EditorComponent");
  }
}

export function isStatusWindow(
  t: Component | undefined | null,
): asserts t is StatusWindow {
  if (!t || (!("name" in t) && t.name() === "status window")) {
    throw new Error("Expected an EditorComponent");
  }
}
