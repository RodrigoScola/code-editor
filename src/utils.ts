import { EditorWindow } from "./Editor/windows/EditorWindow.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { TextEditorWindow } from "./Editor/windows/TextEditorWindow.js";

export function memory(label: string) {
  const m = process.memoryUsage();

  console.log(label, {
    heap: `${(m.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    rss: `${(m.rss / 1024 / 1024).toFixed(1)} MB`,
    external: `${(m.external / 1024 / 1024).toFixed(1)} MB`,
    buffers: `${(m.arrayBuffers / 1024 / 1024).toFixed(1)} MB`,
  });
}

export function isEditorWindow(
  t: EditorWindow | undefined | null,
): asserts t is EditorWindow {
  if (!(t instanceof EditorWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}
export function isTextEditorWindow(
  t: EditorWindow | undefined | null,
): asserts t is TextEditorWindow {
  if (!(t instanceof TextEditorWindow)) {
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
