import { WINDOW_NAMES } from "./constants.js";
import { EditorWindow } from "./Editor/windows/EditorWindow.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { TextEditorWindow } from "./Editor/windows/TextEditorWindow.js";

export function isEditorWindow(
  t: EditorWindow | undefined | null,
): asserts t is EditorWindow {
  if (!(t instanceof EditorWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}

export function isStatusWindow(
  t: EditorWindow | undefined | null,
): asserts t is StatusWindow {
  if (!(t instanceof StatusWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}
