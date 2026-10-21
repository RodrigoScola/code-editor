import { bench, describe } from "vitest";
import { EditorContext } from "../../src/Editor/EditorContext.js";
import { setupEditor as setup } from "../../src/Editor/setup/setupEditor.js";
import { StatusWindow } from "../../src/Editor/windows/StatusEditor.js";
import { FileTreeWindow } from "../../src/Editor/windows/FileTree/FileTreeWindow.js";
import { CodeEditorGroup } from "../../src/Editor/windows/Tab/TabWindow.js";
import { CodeEditorWindow } from "../../src/Editor/windows/CodeEditorWindow.js";
import { UIScreen } from "../../src/ui/components/UiScreen/UIScreen.js";
import { LayoutEngine } from "../../src/ui/layout/layout.js";
import { WINDOW_NAMES } from "../../src/constants.js";

// How much a frame costs in an editor built like index.ts builds it, on a
// 200x50 terminal. Run with `npm run bench`.
//
// The frame loop calls renderIfNeeded() every 10ms, so "idle tick" is what
// the editor costs while nobody types, and "frame after a key" is the work
// between a key and the screen showing it.

function app(width = 200, height = 50) {
  const editor = new EditorContext();
  editor.renderer.setOutput(() => {});
  editor.renderer.setLayout(LayoutEngine.CreateBounds(width, height));
  setup.root(editor);
  editor.rootWindow.layoutConstraints = LayoutEngine.CreateConstraints(
    width,
    height,
  );

  setup.windows.status(editor);
  const window = setup.windows.editor(editor);
  window.view().setDirection("horizontal");
  editor.rootWindow.addChildren(window);

  const popup = new UIScreen().setName(WINDOW_NAMES.POPUP_WINDOW);
  popup.view().setPositionMode("absolute");
  editor.rootWindow.addChildren(popup);
  editor.rootWindow.addChildren(editor.findWindow(StatusWindow)!);

  // no workspace, so the status line doesn't start git in the background
  setup.windows.fileTree(editor);
  window.addChildren(editor.findWindow(FileTreeWindow)!);
  setup.windows.textEditor(editor);
  window.addChildren(editor.findWindow(CodeEditorGroup)!);

  setup.windows.setupSecondarySideBar(editor);
  setup.windows.errorWindow(editor);
  setup.windows.debugWindow(editor);

  setup.commands.register(editor);
  setup.commands.normalMode(editor);
  setup.commands.visualMode(editor);

  editor.focus(editor.findWindow(CodeEditorWindow)!);
  editor.render();
  return editor;
}

describe("frames", () => {
  const editor = app();
  let down = true;

  bench("idle tick (nothing changed)", () => {
    editor.renderIfNeeded();
  });

  bench("frame after a key (cursor moves)", () => {
    editor.keys(down ? "j" : "k");
    down = !down;
    editor.renderIfNeeded();
  });

  bench("frame after an edit (one character)", () => {
    editor.keys("iX<Esc>");
    editor.renderIfNeeded();
  });

  bench("full frame (after a resize)", () => {
    editor.renderer.invalidate();
    editor.render();
  });
});
