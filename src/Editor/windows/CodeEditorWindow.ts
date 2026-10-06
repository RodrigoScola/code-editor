import { text } from "stream/consumers";
import { TextBuffer } from "../../ui/buffer/Buffer.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components/displayComponent.js";
import { ViewPort } from "../../ui/windows/viewport.js";
import { Cursor } from "../Cursor.js";
import { Textdocument } from "../Documents/TextDocument.js";
import {
  EditorView,
  EWindow,
  UiComponent,
  UIScreen,
} from "../../ui/components/UiComponent.js";
import { Canvas } from "../../ui/canvas.js";
import { assert } from "../../assert.js";
import { EditorContext } from "../Editor/Editor.js";

export class CodeEditorWindow extends UiComponent implements EWindow {
  document: Textdocument;

  private _editor: UIScreen;
  private lines: DisplayComponent;

  constructor(document: Textdocument) {
    super();
    this.document = document;

    this._editor = this.initEditor(document);
    assert(this._editor.cursor(), "invalid cursor on text editor?");

    this.view().addChildren(
      new DisplayComponent()
        .setDirection("horizontal")
        .addChildren(
          new DisplayComponent()
            .setDirection("vertical")
            .setHeight("100%")
            .setWidth(5)
            .setName("editor_lines")
            .setBackgroundColor(colors.RED_BACKGROUND)
            .setBold(true)
            .setTextAlign("center"),
        )
        .addChildren(this._editor.view().setName("editor_content")),
    );

    this.lines = this.view().findChildrenByName("editor_lines")!;

    // this.setupLines();
    this.reset();
  }

  defaultFocus(): UiComponent | null {
    return this._editor
  }
  setupLines() {
    let txt = "";

    const viewport = this._editor.view().viewport();

    const firstLine = this.lines.content().getLineAt(0);

    if (firstLine?.content() == viewport.firstLine.toString()) {
      return;
    }

    for (
      let i = viewport.firstLine;
      i < Math.min(viewport.visibleLines + viewport.firstLine, 1000);
      i++
    ) {
      txt += `${i}\n`;
    }

    this.lines.content().setBuffer(new TextBuffer(txt));
  }

  private initEditor(document: Textdocument) {
    const editor = new UIScreen();
    editor.setText(document.read());
    const cursor = editor.cursor();

    assert(cursor, `invalid cursor on editor ${this.name()}`);

    cursor.style.setBackgroundColor(colors.WHITE_BACKGROUND);

    editor
      .view()
      .setName("txt-" + document.file.path())
      .setPaddingLeft(2)
      .styles()
      .setBackgroundColor(colors.BRIGHT_RED_BACKGROUND);

    return editor;
  }
  onPrePaint(): void {
    this.cursor().ensureVisible(this._editor.view().viewport());
    this.setupLines();
  }

  save() {
    this.document.save(this.buffer().content());
  }
  reset() {
    this._editor.cursor().column = 0;
    this._editor.cursor().line = 0;
    this._editor.view().viewport().firstLine = 0;
    this._editor.view().viewport().firstColumn = 0;

    this.cursor()
      .setBuffer(this.buffer())
      .setView(this.view().findChildrenByName("editor_content")!);
  }
  onPostPaint(canvas: Canvas): void {
    this.cursor().paint(canvas);
  }

  openDocument(document: Textdocument) {
    this.document = document;
    const buffer = new TextBuffer(document.read());
    this._editor.view().content().setBuffer(buffer);
    this.cursor().setBuffer(buffer);
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
