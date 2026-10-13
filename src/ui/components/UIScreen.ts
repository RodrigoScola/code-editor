import { assert } from "../../assert.js";
import { Cursor } from "../../Editor/Cursor.js";
import { EditorContext } from "../../Editor/Editor/Editor.js";
import { EditorSelection } from "../../Editor/Selection.js";
import { TextBuffer } from "../buffer/Buffer.js";
import { Canvas } from "../canvas.js";
import { UiComponent } from "./UiComponent.js";

export class UIScreen extends UiComponent {
  private _cursorEnabled: boolean = true;
  // buffer/view are attached in the constructor, once _view exists
  private _cursor: Cursor = new Cursor();

  constructor() {
    super();
    this._cursor.setBuffer(this.view().content()).setView(this.view());
  }

  // setText swaps the view's buffer, so the cursor has to follow it
  setText(str?: TextBuffer | string | null | undefined) {
    super.setText(str);
    this._cursor.setBuffer(this.view().content());
    return this;
  }

  cursorEnabled() {
    return this._cursorEnabled;
  }
  setCursorEnabled(value: boolean) {
    this._cursorEnabled = value;
    return this;
  }

  cursor(): Cursor {
    return this._cursor;
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

  paint(canvas: Canvas): void {
    // the background is already filled by the renderer with styles blended
    // from the parent; refilling here with the raw styles would drop inherited
    // colors (e.g. an unset background would become the terminal default)
    if (this.cursorEnabled()) {
      this.cursor().paintSelection(canvas);
    }
  }

  onPostPaint(canvas: Canvas) {
    if (this.cursorEnabled()) {
      this._cursor.paint(canvas);
    }
  }
  onPrePaint(): void {
    this.cursor().ensureVisible(this.view().viewport());
  }
  onEnter(ctx: EditorContext): void {
    const y = this.cursor().line;
    const x = this.cursor().column;

    const currentLine = this.buffer().at(y);

    if (!currentLine) {
      this.buffer().append();
      this.cursor().moveDown();
      return;
    }

    const currentLineContent = currentLine.slice(0, x);
    const newLineContent = currentLine.slice(x);

    this.buffer().update(y, currentLineContent).insertLine(y, newLineContent);

    this.cursor().moveDown();
    this.cursor().goToLineBeginning();
  }
  removeLine(at: number) {
    this.buffer().removeLine(at);
  }

  selectAll() {
    const cursor = this.cursor();
    const buffer = this.cursor().buffer() || this.buffer();
    const lastLine = buffer.at(-1);

    const endPos = {
      x: Math.max(lastLine?.length || 0, 0),
      y: buffer.count() - 1,
    };

    cursor.selection = new EditorSelection(
      {
        x: 0,
        y: 0,
      },
      endPos,
    );

    cursor.moveTo(endPos.y, endPos.x);
  }

  hasSelection(): boolean {
    return this.cursor().hasSelection();
  }
  private selection(): EditorSelection {
    const selection = this.cursor().selection;
    assert(
      selection,
      `trying to get selected text and has selection but no selection object`,
    );
    return selection;
  }
  selectedText(): string {
    if (!this.hasSelection()) {
      return "";
    }
    const buffer = this.cursor().buffer() || this.buffer();
    return this.selection().text(buffer);
  }
  deleteSelection(): string {
    if (!this.hasSelection()) {
      return "";
    }
    const selection = this.selection();
    const buffer = this.cursor().buffer() || this.buffer();

    const start = selection.start();

    const pos = selection.bufferPosition(buffer);

    const removed = buffer.removeRange(pos.start, pos.end);

    this.cursor().clearSelection();
    this.cursor().moveTo(start.y, start.x);

    return removed;
  }
  private editRange(): { start: Point; end: Point } {
    const cursor = this.cursor();
    if (cursor.hasSelection()) {
      return {
        start: cursor.selection!.start(),
        end: cursor.selection!.end(),
      };
    }
    const at: Point = {
      x: cursor.column,
      y: cursor.line,
    };

    return {
      start: at,
      end: at,
    };
  }
  replaceSelection(content: string): string {
    const buffer = this.buffer();
    const range = this.editRange();

    const from = buffer.offsetOf(range.start.y, range.start.x);

    const removed = buffer.removeRange(
      from,
      buffer.offsetOf(range.end.y, range.end.x),
    );
    buffer.insertAt(from, content);

    this.cursor().clearSelection();
    const after = buffer.index(from + content.length);
    this.cursor().moveTo(after.line, after.character);

    return removed;
  }
}
