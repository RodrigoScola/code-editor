import { describe, it, expect } from "vitest";

import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { TerminalCanvas } from "../../../../src/ui/Canvas/TerminalCanvas.js";
import { TerminalRenderer as Renderer } from "../../../../src/ui/Renderers/TerminalRenderer.js";
import { UIScreen } from "../../../../src/ui/components/UIScreen.js";
import { EditorContext } from "../../../../src/Editor/Editor/Editor.js";
import { TextBuffer } from "../../../../src/ui/buffer/Buffer.js";

describe("tests the buffer and rendering", () => {
  it("creates a buffer and renders the tab correctly", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 6;
    const cnv = new TerminalCanvas().setLayout(layout);

    const editor = new UIScreen().setText("t\tb");
    EditorContext.SetConfiguration({ tab_width: 5 });
    EditorContext;

    editor.view().setLayout(layout);

    LayoutEngine.Measure(
      editor.view(),
      LayoutEngine.CreateConstraints(10),
    ).Arrange(editor.view());

    Renderer.Create(cnv).build(editor.view());
    cnv.renderBoard();

    const first = cnv.getCell(0, 0);

    expect(first?.styles.display(), `should equal the same`).eq("t");
    const last = cnv.getCell(5, 0);

    expect(last?.styles.display(), `should equal the same`).eq("b");
  });
  it.todo("tests the buffer removing an range", () => {});
});
