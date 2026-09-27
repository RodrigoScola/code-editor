import { start } from "repl";
import { buffer } from "stream/consumers";
import { TextBuffer } from "../../ui/buffer/Buffer.js";
import { Canvas } from "../../ui/canvas.js";
import { DisplayComponent } from "../../ui/components/components.js";
import { ViewPort } from "../../ui/windows/viewport.js";
import { Cursor } from "../Cursor.js";
import { EditorContext } from "../Editor/Editor.js";
import { assert } from "../../assert.js";

type WindowId = string;

export class EditorView extends DisplayComponent {
  private editor: EditorWindow;

  constructor(editor: EditorWindow) {
    super();

    this.editor = editor;

    this.setPaintHook(editor.paint.bind(editor));
    this.setPrePaintHook(editor.onPrePaint.bind(editor));
  }
  measure(constraints: MeasureConstraints): MeasuredSize {
    return {
      width: this.viewport().visibleColumns,
      height: this.viewport().visibleLines,
    };
  }
}

export interface EWindow {
  view(): EditorView;
  id(): string;
  focused(): boolean;
  unfocus(): void;
  focus(): void;
  onEvent(event: EditorEvents): void;
  onEnter(ctx: EditorContext): void;
}

export class EditorWindow implements EWindow {
  private _view: EditorView;
  private _active: boolean = false;
  private readonly _id: WindowId = crypto.randomUUID();

  id(): string {
    return this._id;
  }

  focused(): boolean {
    return this._active;
  }

  unfocus() {
    this._active = false;
  }
  focus() {
    this._active = true;
  }

  constructor() {
    this._view = new EditorView(this);
  }
  view(): EditorView {
    return this._view;
  }

  onPrePaint() {
    const cl = this._view.contentLayout();
    this._view.viewport().ensureVisible(cl.width, cl.height);
  }

  paint(canvas: Canvas): void {
    canvas.fillRect(this._view.contentLayout(), this._view.styles());
  }

  onEvent(event: EditorEvents): void {
    // todo: when adding config, this is needing a change
    if (event.name !== "editorModeChange") {
      return;
    }
  }

  onEnter(ctx: EditorContext) {}
}

export class TextEditorWindow extends EditorWindow {
  private _cursor: Cursor = new Cursor(this);

  constructor(str?: TextBuffer | string | null | undefined) {
    super();
    this.setText(str);
  }
  setText(str?: TextBuffer | string | null | undefined) {
    let bffr = new TextBuffer();

    if (typeof str === "string") {
      bffr = new TextBuffer(str);
    } else if (str instanceof TextBuffer) {
      bffr = str;
    } else if (str) {
      throw new Error(
        `tried to pass something other than  text buffer or string `,
      );
    }

    this.view().content().setBuffer(bffr);
    this.view().setDirty(true);
  }

  cursor(): Cursor {
    return this._cursor;
  }
  buffer() {
    return this.view().content().buffer();
  }
  onPrePaint(): void {
    super.onPrePaint();
    this.cursor().ensureVisible(this.view().viewport());
  }

  paint(canvas: Canvas): void {
    super.paint(canvas);
    this.paintSelection(canvas);
  }
  private paintSelection(canvas: Canvas) {
    const selection = this.cursor().selection;
    if (!selection) {
      return;
    }

    const cl = this.view().contentLayout();

    const bounds = selection.bounds(this.view().content().buffer());

    const buffer = this.buffer();

    for (const bound of bounds) {
      let content = buffer.at(bound.y) ?? "";
      content = content.slice(bound.x, bound.width);

      const position = canvas.applyRelative(
        bound.x,
        bound.y - this.view().viewport().firstLine,
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
  goToLineBeginning() {
    const buffer = this.buffer();
    const cursor = this.cursor();

    const currentLine = buffer.at(cursor.line);
    assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

    cursor.column = 0;
    cursor.prefferedColumn = 0;
  }

  goToLineEnd() {
    const buffer = this.buffer();
    const cursor = this.cursor();

    const currentLine = buffer.at(cursor.line);
    assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

    cursor.prefferedColumn = cursor.column = currentLine.length - 1;
  }

  moveCursorDown() {
    return this.cursor().moveDown();
  }
  moveCursorUp() {
    return this.cursor().moveUp();
  }
  moveCursorLeft() {
    return this.cursor().moveLeft();
  }
  moveCursorRight() {
    return this.cursor().moveRight();
  }
  startSelection() {
    return this.cursor().startSelection();
  }
  endSelection() {
    return this.cursor().clearSelection();
  }
}
