import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Canvas } from "../../ui/canvas.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components.js";
import { Cursor } from "../Cursor.js";
import { EditorContext } from "../Editor.js";

export class StatusWindow extends DisplayComponent {
  editor: EditorContext;
  cursor: Cursor = new Cursor();
  buffer: TextBuffer = new TextBuffer("");
  currentCommandLine: number = 0;
  constructor(editor: EditorContext) {
    super();
    this.editor = editor;
  }

  previousCommandLine() {
    this.currentCommandLine = Math.max(0, this.currentCommandLine - 1);
  }

  nextCommandLine() {
    this.currentCommandLine = Math.min(
      this.buffer.lineCount() - 1,
      this.currentCommandLine + 1,
    );
  }

  paint(canvas: Canvas): void {
    const cl = this.contentLayout();
    canvas.fillRect(cl, this.styles());

    let out = "";

    if (this.editor.modeName === "command") {
      out += `command: ${this.buffer.line(this.currentCommandLine)}`;
    } else {
      out += `mode: ${this.editor.modeName}`;
    }

    canvas.drawText(cl.x, cl.y, out, this.styles());

    if (this.editor.modeName === "command") {
      canvas.fillRect(
        canvas.applyRelative(
          this.cursor.column + `command: `.length,
          0,
          this.contentLayout(),
        ),
        this.cursor.style,
      );
    }
  }
  onEvent(event: EditorEvents): void {
    super.onEvent(event);

    if (event.name === "editorModeChange") {
      if (event.mode === "command") {
        this.cursor.style.backgroundColor = colors.RED_BACKGROUND;
        this.cursor.style.color = colors.WHITE_FOREGROUND;

        this.currentCommandLine = this.buffer.lineCount() - 1;
        this.cursor.moveDown(this.buffer);
      }
    }
  }
}
