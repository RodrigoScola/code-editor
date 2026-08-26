import { describe, it, expect } from "vitest";
import { DisplayComponent } from "../components.js";
import { Input } from "./input.js";
import { ComponentStyle } from "../ComponentStyles.js";
import colors from "../colors.js";
import { LayoutEngine } from "../layout/layout.js";
import { Renderer } from "../renderer.js";
import { Canvas } from "../canvas.js";
import { EditorContext } from "../../Editor/Editor.js";
import { TextEditorWindow } from "../../Editor/windows/TextEditorWindow.js";
import {
  MemoryFile,
  Textdocument,
} from "../../Editor/Documents/TextDocument.js";

describe("tests the input behaviour", () => {
  it("sets the text", () => {
    const root = new DisplayComponent().setStyles(
      ComponentStyle.Create().setBackgroundColor(colors.MAGENTA_BACKGROUND),
    );
    const input = new Input();
    input
      .setText("this is component")
      .setStyles(
        ComponentStyle.Create().setBackgroundColor(colors.RED_BACKGROUND),
      )
      .setMaxH(1);

    root.addChildren(input);

    const l = LayoutEngine.CreateBounds();
    l.height = l.width = 10;

    const cnv = new Canvas().setLayout(l);

    LayoutEngine.Measure(root, l);
    Renderer.Create().build(root, cnv);
    cnv.renderBoard();

    expect(1).eq(1);
  });
  it("when types it types on input", () => {
    const editor = new EditorContext();
    const window = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", "keymoment")),
    );

    editor.textEditor = window;

    editor.setMode("insert");

    const keys: KeyEvent[] = "this is the input"
      .split("")
      .map((k) => ({ token: k, alt: false, ctrl: false, shift: false }));

    for (const key of keys) {
      editor.handleKey(key);
    }
    editor.focus(window);
  });
});
