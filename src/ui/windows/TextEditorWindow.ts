import { TextBuffer } from "../buffer/Buffer.js";
import { Canvas } from "../canvas.js";
import colors from "../colors.js";
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

    const line = this.buffer.line(this.cursor.line) ?? "";
    canvas.fillRect(
      canvas.applyRelative(
        this.cursor.column,
        this.cursor.line,
        line,
        this.contentLayout(),
      ),
      this.cursor.style,
    );
  }
  onEvent(event: EditorEvents): void {
    super.onEvent(event);
    // todo: when adding config, this is needing a change
    if (event.name !== "editorModeChange") {
      return;
    }

    if (event.mode === "normal") {
      this.cursor.style.backgroundColor = colors.RED_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    } else if (event.mode === "insert") {
      this.cursor.style.backgroundColor = colors.GREEN_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    } else if (event.mode === "visual") {
      this.cursor.style.backgroundColor = colors.CYAN_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    } else {
      this.cursor.style.backgroundColor = colors.RED_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    }
  }
}
