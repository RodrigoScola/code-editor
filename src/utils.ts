import { UiComponent, UIScreen } from "./ui/components/UiComponent.js";
import { StatusWindow } from "./Editor/windows/StatusEditor.js";
import { CodeEditorWindow } from "./Editor/windows/CodeEditorWindow.js";
import { FileTreeWindow } from "./Editor/windows/FileTreeWindow.js";

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

// returns true/false and narrows the type inside an if
export function isFileTreeWindow(
  t: UiComponent | undefined | null,
): t is FileTreeWindow {
  return t instanceof FileTreeWindow;
}

// throws instead, for code that can't continue without a file tree
export function assertFileTreeWindow(
  t: UiComponent | undefined | null,
): asserts t is FileTreeWindow {
  if (!isFileTreeWindow(t)) {
    throw new Error("Expected a FileTreeWindow");
  }
}

export function isCodeEditorWindow(
  t: UiComponent | undefined | null,
): asserts t is CodeEditorWindow {
  if (!(t instanceof CodeEditorWindow)) {
    throw new Error("Expected an EditorComponent");
  }
}
