import {
  EditorWindow,
  TextEditorWindow,
} from "./Editor/windows/EditorWindow.js";
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

export function isEditorWindow(
  t: EditorWindow | undefined | null,
): asserts t is EditorWindow {
  if (!(t instanceof EditorWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}
export function isStatusEditorWindow(
  t: EditorWindow | undefined | null,
): asserts t is StatusWindow {
  if (!(t instanceof TextEditorWindow)) {
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

export function isCodeEditorWindow(
  t: EditorWindow | undefined | null,
): asserts t is CodeEditorWindow {
  if (!(t instanceof CodeEditorWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}
