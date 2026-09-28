import { text } from "stream/consumers";
import { TextBuffer } from "../../ui/buffer/Buffer.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components/components.js";
import { ViewPort } from "../../ui/windows/viewport.js";
import { Cursor } from "../Cursor.js";
import { Textdocument } from "../Documents/TextDocument.js";
import { EWindow, TextEditorWindow } from "./EditorWindow.js";

export class CodeEditorWindow extends TextEditorWindow implements EWindow {
  document: Textdocument;

  private _editor: TextEditorWindow = new TextEditorWindow();
  private lines: DisplayComponent;

  constructor(document: Textdocument) {
    super();
    this.document = document;

    this._editor = this.initEditor(document);

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
        .addChildren(this._editor.view()),
    );

    this.lines = this.view().findChildrenByName("editor_lines")!;

    // this.setupLines();
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
    const editor = new TextEditorWindow(document.read());

    editor.cursor().style.setBackgroundColor(colors.WHITE_BACKGROUND);
    editor.view().setPaddingLeft(2);

    editor.view().styles().setBackgroundColor(colors.BRIGHT_RED_BACKGROUND);

    editor.setName("txt");
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
  }

  openDocument(document: Textdocument) {
    this.document = document;
    this._editor.view().content().setBuffer(new TextBuffer(document.read()));
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
