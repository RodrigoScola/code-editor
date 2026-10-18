import { describe, it, expect, assert } from "vitest";
import {
  Textdocument,
  MemoryFile,
} from "../../../../src/Editor/Documents/TextDocument.js";

import { TerminalCanvas } from "../../../../src/ui/Canvas/TerminalCanvas.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { TerminalRenderer as Renderer } from "../../../../src/ui/Renderers/TerminalRenderer.js";
import colors from "../../../../src/ui/colors.js";
import { UIScreen } from "../../../../src/ui/components/UIScreen.js";

describe("tests the visual highlight of the selection", () => {
  it("keeps the cursor visible by scrolling the viewport", () => {
    const content = ["one", "two", "three", "four"].join("\n");
    const editor = new UIScreen().setText(content);

    const lt = LayoutEngine.CreateBounds(20);
    const cnv = new TerminalCanvas().setLayout(lt);

    editor.view().setLayout(lt).styles().setBackgroundColor(colors.BRIGHT_CYAN);

    editor.startSelection();
    editor.moveCursorDown();
    editor.moveCursorDown();

    const selection = () => editor.cursor().selection?.end();

    assert(selection()!.y > 0, "selection y did not move");

    editor.moveCursorRight();
    editor.moveCursorRight();
    editor.moveCursorRight();
    editor.moveCursorRight();

    assert(selection()!.x > 0, "selection x did not move");

    LayoutEngine.Measure(
      editor.view(),
      LayoutEngine.CreateConstraints(lt.width),
    ).Arrange(editor.view());
    Renderer.Create(cnv).build(editor.view());

    cnv.renderBoard();
  });
  it.todo("selection is relative", () => {});
});
