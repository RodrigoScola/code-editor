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
    return this.window.content().buffer;
  }
  setBuffer(buffer: TextBuffer) {
    this.window.content().buffer = buffer;
    return this;
  }

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
    const txt = this.window.content();
  }

  paint(canvas: Canvas): void {
    canvas.fillRect(this.window.contentLayout(), this.window.styles());

    const cursorLine = this.window.content().getLineAt(this.cursor.line);

    if (!this.focused()) return;

    this.cursor.paint(canvas, this, cursorLine?.content());

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
      this.window.content().buffer,
    );

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

  visible(): boolean {
    return this.window.visible();
  }
  setVisible(newVal: boolean) {
    this.window.setVisible(newVal);
  }

  moveCursorDown() {
    return this.cursor.moveDown(this.buffer());
  }
  moveCursorUp() {
    return this.cursor.moveUp(this.buffer());
  }
  moveCursorLeft() {
    return this.cursor.moveLeft(this.buffer());
  }
  moveCursorRight() {
    return this.cursor.moveRight(this.buffer());
  }
  onEnter(ctx: EditorContext) {}

  measure(constraints: MeasureConstraints): MeasuredSize {
    return {
      width: this.window.viewport().visibleColumns,
      height: this.window.viewport().visibleLines,
    };
  }
}
