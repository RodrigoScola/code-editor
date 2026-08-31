import { text } from "stream/consumers";
import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Canvas } from "../../ui/canvas.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components.js";
import { ComponentStyle } from "../../ui/ComponentStyles.js";
import { Cursor } from "../Cursor.js";
import { EditorContext } from "../Editor/Editor.js";
import { LayoutEngine } from "../../ui/layout/layout.js";
import { WindowManager } from "../WindowManager.js";

type WindowId = string;

export class EditorWindow {
  cursor: Cursor;
  window: DisplayComponent;
  buffer: TextBuffer = new TextBuffer("");
  private active: boolean = false;
  readonly id: WindowId = crypto.randomUUID();

  blur() {
    this.active = false;
  }
  focus() {
    this.active = true;
  }
  focused() {
    return this.active;
  }

  constructor() {
    this.window = new DisplayComponent();
    this.cursor = new Cursor();
    this.window.setPaintHook(this.paint.bind(this));
    this.window.setPrePaintHook(this.onPrePaint.bind(this));
  }
  onPrePaint() {
    const cl = this.window.contentLayout();
    this.window.viewport().ensureVisible(cl.width, cl.height);
    this.cursor.ensureVisible(this.window.viewport());
  }

  paint(canvas: Canvas): void {
    const cl = this.window.contentLayout();
    this.window.viewport().ensureVisible(cl.width, cl.height);
    this.cursor.ensureVisible(this.window.viewport());

    canvas.fillRect(this.window.contentLayout(), this.window.styles());

    const cursorLine = this.buffer.at(this.cursor.line);
    this.drawBuffer(canvas, this);

    if (!this.focused()) return;

    this.cursor.paint(canvas, this, cursorLine);

    this.paintSelection(canvas);
  }

  paintSelection(canvas: Canvas) {
    const selection = this.cursor.selection;
    if (!selection) {
      return;
    }

    const cl = this.window.contentLayout();

    const bounds = canvas.selectionBounds(
      selection.startSelection(),
      selection.endSelection(),
      this.buffer,
    );

    for (const bound of bounds) {
      let content = this.buffer.at(bound.y) ?? "";
      content = content.slice(bound.x, bound.width);

      const position = canvas.applyRelative(
        bound.x,
        bound.y - this.window.viewport().firstLine,
        cl,
        content,
      );
      const nb = {
        ...position,
        width: bound.width,
        height: bound.height,
      };
      canvas.fillRect(nb, selection.styles);
      canvas.drawText(nb, content);
    }
  }
  onEvent(event: EditorEvents): void {
    // todo: when adding config, this is needing a change
    if (event.name !== "editorModeChange") {
      return;
    }

    const cursor = this.cursor.style;
  }

  drawBuffer(canvas: Canvas, editor: EditorWindow) {
    const cl = editor.window.contentLayout();

    const firstLine = editor.window.viewport().firstLine;
    const lastLine = Math.min(
      firstLine + editor.window.viewport().visibleLines,
      editor.buffer.count(),
    );

    for (let lineNumber = firstLine; lineNumber < lastLine; lineNumber++) {
      const line = editor.buffer.at(lineNumber);
      if (!line) {
        continue;
      }

      const screenY = cl.y + (lineNumber - firstLine);

      canvas.drawText(
        {
          height: cl.height,
          width: cl.width,
          x: cl.x,
          y: screenY,
        },
        line,
        editor.window.styles(),
      );
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
