import { assert } from "../assert.js";
import { ICanvas } from "../ui/Canvas/TerminalCanvas.js";
import colors from "../ui/colors.js";
import { DisplayComponent } from "../ui/display/displayComponent.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { LayoutBounds } from "../ui/layout/LayoutBounds.js";
import { LayoutDimensions } from "../ui/layout/LayoutDimensions.js";
import { ViewPort } from "../ui/windows/viewport.js";
import { EditorSelection } from "./Selection.js";
import { CursorMovement } from "../ui/components/UiScreen/CursorMovement.js";

export class Cursor {
  prefferedColumn: number = 0;

  private _movement: CursorMovement = new CursorMovement(this);

  // in characters and lines, like line and column; paint() makes them pixels
  width: number = 1;
  height: number = 1;

  line: number = 0;
  column: number = 0;
  style: ComponentStyle = ComponentStyle.Create()
    .setBackgroundColor(colors.RED)
    .setColor(colors.BRIGHT_WHITE);

  selection: EditorSelection | null = null;
  private _buffer?: BufferLike;
  private _view?: DisplayComponent;

  hasSelection() {
    return Boolean(this.selection);
  }

  setBuffer(buffer: BufferLike) {
    this._buffer = buffer;
    return this;
  }
  buffer() {
    return this._buffer;
  }
  view() {
    return this._view;
  }
  setView(vp: DisplayComponent) {
    this._view = vp;
    return this;
  }
  private bounds = LayoutBounds.Create();
  layout(): LayoutBounds {
    return this.bounds
      .setHeight(this.height)
      .setWidth(this.width)
      .setX(this.column)
      .setY(this.line);
  }

  // where the cursor is drawn inside the view's content, in pixels: a column
  // is charWidth wide and a line lineHeight tall (1 each on the terminal)
  private screenBounds(view: DisplayComponent, layout: LayoutBounds) {
    const charWidth = view.charWidth();
    const lineHeight = view.lineHeight();
    const row = this.line - (view.viewport()?.firstLine || 0);

    return LayoutBounds.Create(
      this.width * charWidth,
      this.height * lineHeight,
      layout.x + this.column * charWidth,
      layout.y + row * lineHeight,
    );
  }

  private outOfBounds(view: DisplayComponent, bounds: LayoutBounds) {
    const relative = this.screenBounds(view, bounds);
    // its line has to fit: one that starts above the bottom but ends below it
    // is out (on the terminal a line is 1 tall, the same check as before)
    const out =
      relative.x < bounds.x ||
      relative.y < bounds.y ||
      relative.x >= bounds.x + bounds.width ||
      relative.y + view.lineHeight() > bounds.y + bounds.height;

    relative.dispose();
    return out;
  }

  startSelection() {
    const point: Point = {
      x: this.column,
      y: this.line,
    };
    this.selection = new EditorSelection(point, point);
  }
  updateSelection() {
    assert(this.selection, "cannot update selection if there is no selection");
    this.selection?.setHead({ x: this.column, y: this.line });
  }
  clearSelection() {
    this.selection = null;
  }
  paint(canvas: ICanvas) {
    if (!this._view) {
      return;
    }
    const view = this._view;
    const layout = view.contentLayout();

    if (this.outOfBounds(view, layout)) {
      return;
    }

    const relative = this.screenBounds(view, layout);

    // the characters under the cursor, a space past the end of the line
    const content = this.buffer()?.at(this.line) ?? "";
    const final = content
      .slice(this.column, this.column + this.width)
      .padEnd(this.width, " ");

    canvas.drawText(relative, final, this.style);
    relative.dispose();
  }

  private _selectionBounds: LayoutBounds = LayoutBounds.Create();
  paintSelection(canvas: ICanvas) {
    const view = this.view();
    const buffer = this._buffer;
    if (!view || !buffer) {
      return;
    }
    const selection = this.selection;
    if (!selection) {
      return;
    }

    const cl = view.contentLayout();

    const bounds = selection.bounds(buffer);

    for (const bound of bounds) {
      let content = buffer.at(bound.y) ?? "";
      content = content.slice(bound.x, bound.width);

      const position = LayoutDimensions.ApplyRelative(
        bound.x,
        bound.y - view.viewport().firstLine,
        cl,
        content,
      );
      this._selectionBounds.copy(bound);

      canvas.fillRect(this._selectionBounds, selection.styles);
      canvas.drawText(this._selectionBounds, content);
    }
  }

  ensureVisible(viewPort: ViewPort) {
    const lastVisibleLine = viewPort.firstLine + viewPort.visibleLines - 1;
    if (this.line < viewPort.firstLine) {
      viewPort.firstLine = this.line;
    } else if (this.line > lastVisibleLine) {
      viewPort.firstLine = Math.max(0, this.line - viewPort.visibleLines + 1);
    }

    const lastVisibleColumn =
      viewPort.firstColumn + viewPort.visibleColumns - 1;
    if (this.column < viewPort.firstColumn) {
      viewPort.firstColumn = this.column;
    } else if (this.column > lastVisibleColumn) {
      viewPort.firstColumn = Math.max(
        0,
        this.column - viewPort.visibleColumns + 1,
      );
    }
  }
  // the moves themselves live in CursorMovement (see the two kinds there)

  moveTo(line: number, column: number) {
    this._movement.moveTo(line, column);
    return this;
  }

  // VS Code: between characters, left and right wrap
  moveLeft() {
    this._movement.left();
    return this;
  }
  moveRight() {
    this._movement.right();
    return this;
  }
  moveUp() {
    this._movement.up();
    return this;
  }
  moveDown() {
    this._movement.down();
    return this;
  }
  home() {
    this._movement.home();
    return this;
  }
  end() {
    this._movement.end();
    return this;
  }

  // Vim's insert mode (the arrow keys): between characters, nothing wraps
  insertLeft() {
    this._movement.insertLeft();
    return this;
  }
  insertRight() {
    this._movement.insertRight();
    return this;
  }
  insertUp() {
    this._movement.insertUp();
    return this;
  }
  insertDown() {
    this._movement.insertDown();
    return this;
  }

  // Vim's normal mode (h $): on a character, nothing wraps
  vimLeft() {
    this._movement.vimLeft();
    return this;
  }
  lineEnd() {
    this._movement.vimLineEnd();
    return this;
  }

  lineStart() {
    this._movement.lineStart();
    return this;
  }
  goToLineEnd() {
    this._movement.lineEnd();
    return this;
  }

  nextWord() {
    this._movement.nextWord();
    return this;
  }
  previousWordStart() {
    this._movement.previousWordStart();
    return this;
  }
  nextCompleteWordStart() {
    this._movement.nextCompleteWordStart();
    return this;
  }

  atLineStart() {
    return this.column === 0;
  }
  atEnd() {
    return this.line == this.buffer()?.count();
  }
  atLineEnd() {
    const line = this.buffer()?.at(this.line);
    if (!line) return false;
    return this.column === line.length;
  }
  atLastLine() {
    return (this.buffer()?.count() || 0) - 1 === this.line;
  }
  reset() {
    this.line = 0;
    this.column = 0;
    this.prefferedColumn = 0;
  }
}
