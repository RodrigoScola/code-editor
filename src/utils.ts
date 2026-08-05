import { DisplayComponent } from "./ui/components.js";
import { TextEditorWindow } from "./ui/windows/TextEditorWindow.js";

export function isTextEditor(
  t: DisplayComponent | undefined | null,
): asserts t is TextEditorWindow {
  if (!t || !("cursor" in t)) {
    throw new Error("Expected an EditorComponent");
  }
}
