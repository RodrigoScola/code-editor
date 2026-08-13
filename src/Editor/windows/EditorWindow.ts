import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Canvas } from "../../ui/canvas.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components.js";
import { ViewPort } from "../../ui/windows/viewport.js";
import { Cursor } from "../Cursor.js";
import { EditorContext } from "../Editor.js";
import { TextEditorWindow } from "./TextEditorWindow.js";

export class EditorWindow {
  cursor: Cursor;
  viewPort: ViewPort = new ViewPort();
  window: DisplayComponent;
  buffer: TextBuffer = new TextBuffer("");

  constructor() {
    this.window = new DisplayComponent();
    this.cursor = new Cursor();
    this.window.setPaintHook(this.paint.bind(this));
    this.window.setPrePaintHook(this.onPrePaint.bind(this));
  }
  onPrePaint() {
    const cl = this.window.contentLayout();
    this.viewPort.ensureVisible(cl.width, cl.height);
    this.cursor.ensureCursorVisible(this.viewPort);
  }

  paint(canvas: Canvas): void {
    const cl = this.window.contentLayout();
    this.viewPort.ensureVisible(cl.width, cl.height);
    this.cursor.ensureCursorVisible(this.viewPort);

    canvas.fillRect(this.window.contentLayout(), this.window.styles());

    const cursorLine = this.buffer.at(this.cursor.line);
    this.drawBuffer(canvas, this);

    this.cursor.paint(canvas, this, cursorLine);
  }
  onEvent(event: EditorEvents): void {
    // todo: when adding config, this is needing a change
    if (event.name !== "editorModeChange") {
      return;
    }

    const cursor = this.cursor.style;

    if (event.mode === "normal") {
      cursor
        .setBackgroundColor(colors.RED_BACKGROUND)
        .setColor(colors.WHITE_FOREGROUND);
    } else if (event.mode === "insert") {
      this.cursor.style.setBackgroundColor(colors.GREEN_BACKGROUND);
      this.cursor.style.setColor(colors.WHITE_FOREGROUND);
    } else if (event.mode === "visual") {
      this.cursor.style.setBackgroundColor(colors.CYAN_BACKGROUND);
      this.cursor.style.setColor(colors.WHITE_FOREGROUND);
    } else {
      this.cursor.style.setBackgroundColor(colors.RED_BACKGROUND);
      this.cursor.style.setColor(colors.WHITE_FOREGROUND);
    }
  }

  drawBuffer(canvas: Canvas, editor: EditorWindow) {
    const cl = editor.window.contentLayout();

    const firstLine = editor.viewPort.firstLine;
    const lastLine = Math.min(
      firstLine + editor.viewPort.visibleLines,
      editor.buffer.count(),
    );

    for (let lineNumber = firstLine; lineNumber < lastLine; lineNumber++) {
      const line = editor.buffer.at(lineNumber);
      if (!line) {
        continue;
      }

      const screenY = cl.y + (lineNumber - firstLine);

      canvas.drawText(cl.x, screenY, line, editor.window.styles());
    }
  }
  visible(): boolean {
    return this.window.visible();
  }
  setVisible(newVal: boolean) {
    this.window.setVisible(newVal);
  }

  moveCursorDown() {
    return this.cursor.moveDown(this.buffer);
  }
  moveCursorUp() {
    return this.cursor.moveUp(this.buffer);
  }
  moveCursorLeft() {
    return this.cursor.moveLeft(this.buffer);
  }
  moveCursorRight() {
    return this.cursor.moveRight(this.buffer);
  }
  onEnter(ctx: EditorContext) {}
}
