import { describe, it, expect, assert } from "vitest";
import { Textdocument, MemoryFile } from "../../../../src/Editor/Documents/TextDocument.js";
import { TextEditorWindow } from "../../../../src/Editor/windows/TextEditorWindow.js";
import { Canvas } from "../../../../src/ui/canvas.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import colors from "../../../../src/ui/colors.js";

describe("tests the visual highlight of the selection", () => {
  it("keeps the cursor visible by scrolling the viewport", () => {
    const content = ["one", "two", "three", "four"].join("\n");
    const editor = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", content)),
    );

    const lt = LayoutEngine.CreateBounds(20);
    const cnv = new Canvas().setLayout(lt);

    editor.window
      .setLayout(lt)
      .styles()
      .setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

    editor.cursor.startSelection();
    editor.moveCursorDown();
    editor.moveCursorDown();

    const selection = () => editor.cursor.selection?.endSelection();

    assert(selection()!.y > 0, "selection y did not move");

    editor.moveCursorRight();
    editor.moveCursorRight();
    editor.moveCursorRight();
    editor.moveCursorRight();

    assert(selection()!.x > 0, "selection x did not move");

    LayoutEngine.Measure(
      editor.window,
      LayoutEngine.CreateConstraints(lt.width),
    ).Arrange(editor.window);
    Renderer.Create().build(editor.window, cnv);

    cnv.renderBoard();
  });
});
