import { DisplayComponent } from "./ui/components.js";
import { EditorComponent } from "./ui/EditorComponent.js";

export function isTextEditor(
  t: DisplayComponent | undefined | null,
): asserts t is EditorComponent {
  if (!t || !("cursor" in t)) {
    throw new Error("Expected an EditorComponent");
  }
}
