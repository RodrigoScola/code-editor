import { start } from "repl";
import { buffer } from "stream/consumers";
import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Canvas } from "../../ui/canvas.js";
import { DisplayComponent } from "../../ui/components/components.js";
import { ViewPort } from "../../ui/windows/viewport.js";
import { Cursor } from "../Cursor.js";
import { EditorContext } from "../Editor/Editor.js";

type WindowId = string;

export class EditorView extends DisplayComponent {
  constructor(private editor: EditorWindow) {
    super();
  }
  measure(constraints: MeasureConstraints): MeasuredSize {
    return this.editor.measure(constraints);
  }
}

export class EditorWindow {
  cursor: Cursor;
  window: DisplayComponent;
  private active: boolean = false;
  readonly id: WindowId = crypto.randomUUID();

  buffer() {
    return this.window.content().buffer();
  }
  setBuffer(buffer: TextBuffer) {
    this.window.content().setBuffer(buffer);
    return this;
  }

  blur() {
    this.active = false;
  }
  focus() {
    this.active = true;
    this.window.setFocused(true);
  }
  focused() {
    return this.active;
  }

  constructor() {
    this.window = new DisplayComponent();
    this.cursor = new Cursor(this.window);
    this.window.setPaintHook(this.paint.bind(this));
    this.window.setPrePaintHook(this.onPrePaint.bind(this));
  }
  onPrePaint() {
    const cl = this.window.contentLayout();
    this.window.viewport().ensureVisible(cl.width, cl.height);
    this.cursor.ensureVisible();
  }

  paint(canvas: Canvas): void {
    canvas.fillRect(this.window.contentLayout(), this.window.styles());

    this.paintSelection(canvas);
  }

  paintSelection(canvas: Canvas) {
    const selection = this.cursor.selection;
    if (!selection) {
      return;
    }

    const cl = this.window.contentLayout();

    const bounds = selection.bounds(this.window.content().buffer());

    for (const bound of bounds) {
      let content = this.buffer().at(bound.y) ?? "";
      content = content.slice(bound.x, bound.width);

      const position = canvas.applyRelative(
        bound.x,
        bound.y - this.window.viewport().firstLine,
        cl,
        content,
      );
      const nb = {
        x: position.x,
        y: position.y,
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
  }

  visible(): boolean {
    return this.window.visible();
  }
  setVisible(newVal: boolean) {
    this.window.setVisible(newVal);
  }

  moveCursorDown() {
    return this.cursor.moveDown();
  }
  moveCursorUp() {
    return this.cursor.moveUp();
  }
  moveCursorLeft() {
    return this.cursor.moveLeft();
  }
  moveCursorRight() {
    return this.cursor.moveRight();
  }
  onEnter(ctx: EditorContext) {}

  measure(constraints: MeasureConstraints): MeasuredSize {
    return {
      width: this.window.viewport().visibleColumns,
      height: this.window.viewport().visibleLines,
    };
  }
}
