import { TextBuffer } from "../Buffer.js";
import { Canvas } from "../canvas.js";
import { DisplayComponent } from "../components.js";
import { Cursor } from "../Cursor.js";

export class TextEditorWindow extends DisplayComponent {
  buffer: TextBuffer;
  cursor: Cursor;

  constructor(buffer: TextBuffer) {
    super();
    this.buffer = buffer;
    this.cursor = new Cursor();
  }

  paint(canvas: Canvas): void {
    canvas.fillRect(this.contentLayout(), this.styles());

    for (let i = 0; i < this.buffer.lineCount(); i++) {
      const line = this.buffer.line(i);
      if (this.contentLayout().y + i >= this.contentLayout().height) {
        break;
      }
      if (!line) {
        continue;
      }
      canvas.drawText(
        this.contentLayout().x,
        this.contentLayout().y + i,
        line,
        this.styles(),
      );
    }
    canvas.fillRect(this.applyRelative(this.cursor), this.cursor.style);
  }
  applyRelative(cursor: Cursor): LayoutBounds {
    const cl = this.contentLayout();

    return {
      height: 1,
      width: 1,
      x: cl.x + cursor.column,
      y: cl.y + cursor.line,
    };
  }
}
