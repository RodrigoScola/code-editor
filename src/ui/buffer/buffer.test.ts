import { describe, it, expect } from "vitest";
import { TextEditorWindow } from "../../Editor/windows/TextEditorWindow.js";
import { LayoutEngine } from "../layout/layout.js";
import { Canvas } from "../canvas.js";
import { Renderer } from "../renderer.js";
import {
  MemoryFile,
  Textdocument,
} from "../../Editor/Documents/TextDocument.js";

describe("tests the buffer and rendering", () => {
  it("creates a buffer and renders the tab correctly", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 6;
    const cnv = new Canvas().setLayout(layout);

    const window = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "t\tb")),
    );
    cnv.tab_width = 5;
    window.window.setLayout(layout);

    LayoutEngine.Measure(window.window, window.window.layout());

    Renderer.Create().build(window.window, cnv);

    const first = cnv.getCell(0, 0);

    cnv.renderBoard();

    expect(first?.styles.display(), `should equal the same`).eq("t");
    const last = cnv.getCell(5, 0);

    expect(last?.styles.display(), `should equal the same`).eq("b");
  });
});
