import { describe, expect, it } from "vitest";
import { TabWindow } from "../../../../../src/Editor/windows/Tab/TabWindow.js";
import { DisplayComponent } from "../../../../../src/ui/components/components.js";
import { Canvas } from "../../../../../src/ui/canvas.js";
import { LayoutEngine } from "../../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../../src/ui/renderer.js";
import colors from "../../../../../src/ui/colors.js";
import { EditorRoot } from "../../../../../src/Editor/Editor/EditorRoot.js";
import { EditorWindow } from "../../../../../src/Editor/windows/EditorWindow.js";
import { TextEditorWindow } from "../../../../../src/Editor/windows/TextEditorWindow.js";
import {
  DiskFile,
  MemoryFile,
  Textdocument,
} from "../../../../../src/Editor/Documents/TextDocument.js";
import { TextBuffer } from "../../../../../src/ui/buffer/Buffer.js";

describe("tests the tab component", () => {
  it("shows the tab", () => {
    const layout = LayoutEngine.CreateBounds(30, 30);
    const canvas = new Canvas().setLayout(layout);

    const root = new EditorRoot().setLayout(layout);

    const tab = new TabWindow();

    const editor = new TextEditorWindow(
      new Textdocument(new MemoryFile("test", "this\nis\ncooo")),
    );
    editor.window.setName("text editor");
    editor.window.styles().setBackgroundColor(colors.PINK_BACKGROUND);

    root.addChildren(tab.window);

    tab.add("editor", editor);
    LayoutEngine.Measure(
      root,
      LayoutEngine.CreateConstraints(layout.width),
    ).Arrange(root);
    Renderer.Create().build(root, canvas);

    canvas.renderBoard();
  });
});
