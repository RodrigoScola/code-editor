import { TextBuffer } from "../../ui/buffer/Buffer.js";
import colors from "../../ui/colors.js";
import { Cursor } from "../Cursor.js";
import { Textdocument } from "../Documents/TextDocument.js";
import { EWindow, TextEditorWindow } from "./EditorWindow.js";

export class CodeEditorWindow extends TextEditorWindow implements EWindow {
  document: Textdocument;

  private _editor: TextEditorWindow;

  constructor(document: Textdocument) {
    super();
    this.document = document;

    this._editor = this.setupEditor(document);
    // const lines = new DisplayComponent().setWidth(2).setHeight("100%");

    // lines.styles().setBackgroundColor(colors.YELLOW_BACKGROUND);

    this.view().addChildren(this._editor.view());
  }

  private setupEditor(document: Textdocument) {
    const editor = new TextEditorWindow(document.read());

    editor.cursor().style.setBackgroundColor(colors.WHITE_BACKGROUND);

    editor.view().styles().setBackgroundColor(colors.BRIGHT_RED_BACKGROUND);

    return editor;
  }
  onPrePaint(): void {
    this.cursor().ensureVisible(this._editor.view().viewport());
  }

  save() {
    this.document.save(this.view().content().buffer().content());
  }
  reset() {
    this._editor.cursor().column = 0;
    this._editor.cursor().line = 0;
    this.view().viewport().firstLine = 0;
    this.view().viewport().firstColumn = 0;
  }

  openDocument(document: Textdocument) {
    this.document = document;
    this.view().content().setBuffer(new TextBuffer(document.read()));
  }
  name() {
    return this.document.file.path();
  }
  cursor(): Cursor {
    return this._editor.cursor();
  }
  buffer(): TextBuffer {
    return this._editor.buffer();
  }
}
