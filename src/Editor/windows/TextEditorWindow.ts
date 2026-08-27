import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Canvas } from "../../ui/canvas.js";
import { Cursor } from '../Cursor.js';
import { Textdocument } from "../Documents/TextDocument.js";
import { EditorWindow } from "./EditorWindow.js";

export class TextEditorWindow extends EditorWindow implements BufferLike {
  document: Textdocument;

  constructor(document: Textdocument) {
    super();
    this.document = document;
    this.buffer = new TextBuffer(document.read());
  }
  paint(canvas: Canvas): void {
    super.paint(canvas);
  }

  save() {
    this.document.save(this.buffer.content());
  }
  at(line: number): string | undefined {
    return this.buffer.at(line);
  }
  count(): number {
    return this.buffer.count();
  }
  reset() {
    this.cursor.column = 0;
    this.cursor.line = 0;
    this.window.viewport().firstLine = 0;
    this.window.viewport().firstColumn = 0;
  }
  openDocument(document: Textdocument) {
    this.document = document;
    this.buffer = new TextBuffer(document.read());
    this.cursor = new Cursor()
  }
}
