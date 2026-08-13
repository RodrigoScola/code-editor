import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Textdocument } from "../Documents/TextDocument.js";
import { EditorWindow } from "./EditorWindow.js";

export class TextEditorWindow extends EditorWindow implements BufferLike {
  document: Textdocument;

  constructor(document: Textdocument) {
    super();
    this.document = document;
    this.buffer = new TextBuffer(document.read());
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
  }
}
