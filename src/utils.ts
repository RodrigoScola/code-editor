import { UiComponent, UIScreen } from "./ui/components/UiComponent.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { CodeEditorWindow } from "./Editor/windows/CodeEditorWindow.js";

export function memory(label: string) {
  const m = process.memoryUsage();

  console.log(label, {
    heap: `${(m.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    rss: `${(m.rss / 1024 / 1024).toFixed(1)} MB`,
    external: `${(m.external / 1024 / 1024).toFixed(1)} MB`,
    buffers: `${(m.arrayBuffers / 1024 / 1024).toFixed(1)} MB`,
  });
}

export function isStatusEditorWindow(
  t: UiComponent | undefined | null,
): asserts t is StatusWindow {
  if (!(t instanceof StatusWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}
export function isTextComponent(
  t: UiComponent | undefined | null,
): asserts t is UIScreen {
  if (!(t instanceof UIScreen)) {
    throw new Error("Expected an EditorComponent");
  }
}

export function isCodeEditorWindow(
  t: UiComponent | undefined | null,
): asserts t is CodeEditorWindow {
  if (!(t instanceof CodeEditorWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}
