import { assert } from "../../assert.js";
import { Cursor } from "../../Editor/Cursor.js";
import { EditorContext } from "../../Editor/Editor/Editor.js";
import { EditorSelection } from "../../Editor/Selection.js";
import { TextBuffer } from "../buffer/Buffer.js";
import { ICanvas } from "../Canvas/TerminalCanvas.js";
import { UiComponent } from "./UiComponent.js";

export class UIScreen extends UiComponent {
  private _cursorEnabled: boolean = true;
  // buffer/view are attached in the constructor, once _view exists
  private _cursor: Cursor = new Cursor();

  constructor() {
    super();
    this._cursor.setBuffer(this.view().content()).setView(this.view());
  }

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
  moveNextWord() {
    return this.cursor().nextWord();
  }
  movePreviousWord() {
    this.cursor().previousWordStart();
  }
  moveNextCompleteWord() {
    this.cursor().nextCompleteWordStart();
  }

  moveCursorDown() {
    this.cursor().moveDown();
    return this;
  }
  moveCursorUp() {
    this.cursor().moveUp();
    return this;
  }
  moveCursorLeft() {
    this.cursor().moveLeft();
    return this;
  }
  moveCursorRight() {
    this.cursor().moveRight();
    return this;
  }
  moveCursorHome() {
    this.cursor().home();
    return this;
  }
  moveCursorEnd() {
    this.cursor().end();
    return this;
  }

  insertMoveDown() {
    this.cursor().insertDown();
    return this;
  }
  insertMoveUp() {
    this.cursor().insertUp();
    return this;
  }
  insertMoveLeft() {
    this.cursor().insertLeft();
    return this;
  }
  insertMoveRight() {
    this.cursor().insertRight();
    return this;
  }

  vimMoveLeft() {
    this.cursor().vimLeft();
    return this;
  }

  moveLineEnd() {
    this.cursor().lineEnd();
    return this;
  }
  moveLineStart() {
    this.cursor().lineStart();
    return this;
  }

  startSelectionIfNone() {
    if (!this.hasSelection()) this.startSelection();
    return this;
  }

  collapseSelection(side: "start" | "end") {
    const cursor = this.cursor();
    const selection = cursor.selection;
    cursor.clearSelection();
    if (!selection || selection.isEmpty()) {
      return false;
    }

    const point = side === "start" ? selection.start() : selection.end();
    cursor.moveTo(point.y, point.x);
    return true;
  }

  startSelection() {
    return this.cursor().startSelection();
  }
  endSelection() {
    return this.cursor().clearSelection();
  }

  paint(canvas: ICanvas): void {
    if (this.cursorEnabled()) {
      this.cursor().paintSelection(canvas);
    }
  }

  onPostPaint(canvas: ICanvas) {
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
    this.cursor().lineStart();
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
  deleteRight() {
    if (this.hasSelection()) {
      this.deleteSelection();
      return;
    }

    const cursor = this.cursor();
    const buffer = cursor.buffer() || this.buffer();

    const cursorIndex = buffer.offsetOf(cursor.line, cursor.column);

    if (!cursor.atLineEnd()) {
      buffer.removeRange(cursorIndex, cursorIndex + 1);
      return;
    }

    if (cursor.atEnd()) {
      return;
    }

    buffer.removeRange(cursorIndex, cursorIndex + 1);
  }
  deleteLeft() {
    const cursor = this.cursor();
    const buffer = cursor.buffer() || this.buffer();

    if (this.hasSelection()) {
      this.deleteSelection();
      return;
    }

    const cursorIndex = buffer.offsetOf(cursor.line, cursor.column);

    if (!cursor.atLineStart()) {
      buffer.removeRange(cursorIndex - 1, cursorIndex);
      cursor.moveLeft();
      return;
    }

    if (cursor.line === 0) {
      return;
    }

    // removing the "\n" joins the lines, so measure the previous line first
    const previousLength = buffer.at(cursor.line - 1)?.length ?? 0;
    buffer.removeRange(cursorIndex - 1, cursorIndex);
    cursor.moveTo(cursor.line - 1, previousLength);
  }
}
