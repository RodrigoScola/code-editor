import { describe, it, expect } from "vitest";
import { TextEditorWindow } from "../../../../src/Editor/windows/TextEditorWindow.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Canvas } from "../../../../src/ui/canvas.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import {
  MemoryFile,
  Textdocument,
} from "../../../../src/Editor/Documents/TextDocument.js";

describe("tests the buffer and rendering", () => {
  it("creates a buffer and renders the tab correctly", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 6;
    const cnv = new Canvas().setLayout(layout);

    const editor = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "t\tb")),
    );
    cnv.tab_width = 5;
    editor.window.setLayout(layout);

    LayoutEngine.Measure(
      editor.window,
      LayoutEngine.CreateConstraints(10),
    ).Arrange(editor.window);

    Renderer.Create().build(editor.window, cnv);
    cnv.renderBoard();

    const first = cnv.getCell(0, 0);

    expect(first?.styles.display(), `should equal the same`).eq("t");
    const last = cnv.getCell(5, 0);

    expect(last?.styles.display(), `should equal the same`).eq("b");
  });
});
