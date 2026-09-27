import { describe, it, expect } from "vitest";

import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Canvas } from "../../../../src/ui/canvas.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import { TextEditorWindow } from "../../../../src/Editor/windows/EditorWindow.js";

describe("tests the buffer and rendering", () => {
  it("creates a buffer and renders the tab correctly", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 6;
    const cnv = new Canvas().setLayout(layout);

    const editor = new TextEditorWindow("t\tb");
    cnv.tab_width = 5;
    editor.view().setLayout(layout);

    LayoutEngine.Measure(
      editor.view(),
      LayoutEngine.CreateConstraints(10),
    ).Arrange(editor.view());

    Renderer.Create().build(editor.view(), cnv);
    cnv.renderBoard();

    const first = cnv.getCell(0, 0);

    expect(first?.styles.display(), `should equal the same`).eq("t");
    const last = cnv.getCell(5, 0);

    expect(last?.styles.display(), `should equal the same`).eq("b");
  });
});
