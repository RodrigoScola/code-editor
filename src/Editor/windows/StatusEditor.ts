import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Canvas } from "../../ui/canvas.js";
import colors from "../../ui/colors.js";
import { Cursor } from "../Cursor.js";
import { EditorContext } from "../Editor/Editor.js";
import { EditorWindow } from "./EditorWindow.js";

export class StatusWindow extends EditorWindow {
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
    this.currentCommandLine = Math.max(
      Math.min(this.buffer.count() - 1, this.currentCommandLine + 1),
      0,
    );
  }

  paint(canvas: Canvas): void {
    const cl = this.window.contentLayout();
    canvas.fillRect(cl, this.window.styles());

    let out = "";

    if (this.editor.modeName === "command") {
      out += `command: ${this.buffer.at(this.currentCommandLine) || ""} `;
    } else {
      out += `mode: ${this.editor.modeName}`;
    }

    canvas.drawText(cl, out, this.window.styles());

    if (this.editor.modeName === "command") {
      const content = this.buffer.at(this.cursor.line);
      let len = `command: `.length + (content?.length ?? 0);

      canvas.fillRect(
        canvas.applyRelative(len, 0, this.window.contentLayout()),
        this.cursor.style,
      );
    }
  }
  onEvent(event: EditorEvents): void {
    super.onEvent(event);

    if (event.name === "editorModeChange") {
      if (event.mode === "command") {
        this.cursor.style.setBackgroundColor(colors.RED_BACKGROUND);
        this.cursor.style.setColor(colors.WHITE_FOREGROUND);

        this.currentCommandLine = Math.max(this.buffer.count() - 1, 0);
        this.cursor.moveDown(this.buffer);
      }
    }
    if (event.name === "submitCommand") {
      this.currentCommandLine++;
      this.nextCommandLine();
      this.buffer.newLine();
    }
  }
}
