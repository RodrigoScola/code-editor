import { TextBuffer } from "../../ui/buffer/Buffer.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components/components.js";
import { Textdocument } from "../Documents/TextDocument.js";
import { EditorWindow } from "./EditorWindow.js";
import { Cursor } from "../Cursor.js";

export class TextEditorWindow extends EditorWindow {
  document: Textdocument;

  constructor(document: Textdocument) {
    super();
    this.document = document;
    this.cursor = new Cursor(this.window);

    this.cursor.style.setBackgroundColor(colors.WHITE_BACKGROUND);

    this.setBuffer(new TextBuffer(document.read()));
  }

  onPrePaint() {
    const cl = this.window.contentLayout();
    this.window.viewport().ensureVisible(cl.width, cl.height);
    this.cursor.ensureVisible();
  }


  applyLines() {
    const lineComponent = new DisplayComponent().setWidth("fit-content");

    lineComponent
      .setWrap("no-wrap")
      .styles()
      .setUnderline(true)
      .setItalic(true)

      .setBackgroundColor(colors.GRAY_BACKGROUND);

    const lineBuffer = new TextBuffer();
    for (let i = 0; i < this.window.content().height(); i++) {
      lineBuffer.addLine(`${i}`);
    }

    lineComponent.content().setBuffer(lineBuffer);

    this.window.addChildren(lineComponent);
  }

  save() {
    this.document.save(this.window.content().buffer().content());
  }
  at(line: number): string | undefined {
    return this.buffer().at(line);
  }
  count(): number {
    return this.buffer().count();
  }
  reset() {
    this.cursor.column = 0;
    this.cursor.line = 0;
    this.window.viewport().firstLine = 0;
    this.window.viewport().firstColumn = 0;
  }
  openDocument(document: Textdocument) {
    this.document = document;
    this.setBuffer(new TextBuffer(document.read()));
    this.cursor = new Cursor(this.window);
  }
  name() {
    return this.document.file.path();
  }
}
