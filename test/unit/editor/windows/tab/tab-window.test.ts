import { describe, it } from "vitest";
import { TabWindow } from "../../../../../src/Editor/windows/Tab/TabWindow.js";
import { Canvas } from "../../../../../src/ui/canvas.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../../src/ui/renderer.js";
import colors from "../../../../../src/ui/colors.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import {
  MemoryFile,
  Textdocument,
} from "../../../../../src/Editor/Documents/TextDocument.js";
import { CodeEditorWindow } from "../../../../../src/Editor/windows/CodeEditorWindow.js";

describe("tests the tab component", () => {
  it("shows the tab", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const root = new EditorRoot().setLayout(layout);

    const tab = new TabWindow();

    const editor = new CodeEditorWindow(
      new Textdocument(new MemoryFile("test", "this\nis\ncooo")),
    );
    editor.view().styles().setBackgroundColor(colors.PINK_BACKGROUND);

    root.addChildren(tab.view());

    tab.add("editor", editor);
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });
});
