import { describe, it, expect, assert } from "vitest";
import { Textdocument, MemoryFile } from "./Documents/TextDocument.js";
import { TextEditorWindow } from "./windows/TextEditorWindow.js";
import { Canvas } from "../ui/canvas.js";
import { LayoutEngine } from "../ui/layout/layout.js";
import { Renderer } from "../ui/renderer.js";
import colors from "../ui/colors.js";

describe("tests the visual highlight of the selection", () => {
  it("keeps the cursor visible by scrolling the viewport", () => {
    const content = ["one", "two", "three", "four"].join("\n");
    const editor = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", content)),
    );

    const lt = LayoutEngine.CreateBounds();
    lt.height = lt.width = 20;

    editor.cursor.startSelection();
    editor.moveCursorDown();
    editor.moveCursorDown();
    assert(
      editor.cursor.selection!.endSelection().y > 0,
      "selection y did not move",
    );

    editor.moveCursorRight();
    editor.moveCursorRight();
    editor.moveCursorRight();
    editor.moveCursorRight();

    assert(
      editor.cursor.selection!.endSelection().x > 0,
      "selection x did not move",
    );

    editor.window
      .setLayout(lt)
      .styles()
      ?.setBackgroundColor(colors.BRIGHT_CYAN_BACKGROUND);

    const cnv = new Canvas().setLayout(lt);

    LayoutEngine.Measure(editor.window, editor.window.contentLayout());
    Renderer.Create().build(editor.window, cnv);

    console.log(
      cnv
        .getRow(2)
        ?.map((f) => f.styles.display())
        .join(""),
    );

    cnv.renderBoard();
  });
});
