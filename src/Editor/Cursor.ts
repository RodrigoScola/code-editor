import { assert } from "../assert.js";
import { ICanvas } from "../ui/Canvas/TerminalCanvas.js";
import colors from "../ui/colors.js";
import { DisplayComponent } from "../ui/display/displayComponent.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { LayoutEngine } from "../ui/layout/layout.js";
import { LayoutBounds } from "../ui/layout/LayoutBounds.js";
import { LayoutDimensions } from "../ui/layout/LayoutDimensions.js";
import { ViewPort } from "../ui/windows/viewport.js";
import { EditorSelection } from "./Selection.js";
import { Canvas } from "@napi-rs/canvas";

export class Cursor {
  prefferedColumn: number = 0;

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

  private outOfBounds(bounds: LayoutBounds) {
    const relative = LayoutDimensions.ApplyRelative(
      this.column,
      this.line - (this._view?.viewport()?.firstLine || 0),
      bounds,
    );

    return (
      relative.x < bounds.x ||
      relative.y < bounds.y ||
      relative.x >= bounds.x + bounds.width ||
      relative.y >= bounds.y + bounds.height
    );
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
    const layout = this._view?.contentLayout();

    if (this.outOfBounds(layout)) {
      return;
    }

    const relative = LayoutDimensions.ApplyRelative(
      this.column,
      this.line - (this._view?.viewport().firstLine || 0),
      layout,
    );

    relative.setHeight(this.height).setWidth(this.width);

    const content = this.buffer()?.at(this.line);
    assert(content, `invalid display row at ${relative.y}`);

    let final = "";
    for (let i = relative.x; i < relative.x + relative.width; i++) {
      final += content[i];
    }

    canvas.drawText(relative, final, this.style);
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
  moveDown() {
    const buffer = this._buffer;
    if (!buffer) {
      return this;
    }

    this.line = Math.max(Math.min(this.line + 1, buffer.count() - 1), 0);

    let nextLinePos = this.prefferedColumn;

    const line = buffer.at(this.line);
    if (line) {
      nextLinePos = line.length - 1;
    } else {
      nextLinePos = 0;
    }

    this.column = Math.min(this.prefferedColumn, nextLinePos);

    if (this.selection) {
      this.updateSelection();
    }
    return this;
  }

  moveTo(line: number, column: number) {
    const buffer = this._buffer;
    if (!buffer) {
      return;
    }

    this.line = Math.max(Math.min(line, buffer.count() - 1), 0);
    const length = buffer.at(this.line)?.length ?? 0;
    this.column = Math.max(Math.min(column, length), 0);
    this.prefferedColumn = this.column;

    if (this.selection) this.updateSelection();
  }

  moveUp() {
    const buffer = this._buffer;
    if (!buffer) {
      return this;
    }

    this.line = Math.max(this.line - 1, 0);

    let nextLinePos = this.prefferedColumn;

    const line = buffer.at(this.line);
    if (line) {
      nextLinePos = line.length - 1;
    } else {
      nextLinePos = 0;
    }

    this.column = Math.min(this.prefferedColumn, nextLinePos);

    if (this.selection) this.updateSelection();
    return this;
  }
  moveLeft() {
    this.column = Math.max(this.column - 1, 0);
    return this;
  }
  moveRight() {
    const buffer = this._buffer;
    if (!buffer) {
      return;
    }

    const line = buffer.at(this.line);

    let bufferLine = line?.length;

    if (bufferLine) {
      bufferLine -= 1;
    }

    const lineLength = bufferLine ?? this.column + 1;

    this.column = Math.min(this.column + 1, Math.max(lineLength, 0));

    this.prefferedColumn = this.column;

    if (this.selection) this.updateSelection();
    return this;
  }
  reset() {
    this.line = 0;
    this.column = 0;
    this.prefferedColumn = 0;
  }

  goToLineBeginning() {
    const buffer = this._buffer;
    if (!buffer) {
      return;
    }

    const currentLine = buffer.at(this.line);
    assert(currentLine !== undefined, `invalid current line: ${this.line}`);

    this.column = 0;
    this.prefferedColumn = 0;
    return this;
  }

  goToLineEnd() {
    const buffer = this._buffer;
    if (!buffer) {
      return;
    }

    const currentLine = buffer.at(this.line);
    assert(currentLine !== undefined, `invalid current line: ${this.line}`);

    this.prefferedColumn = this.column = Math.max(currentLine.length - 1, 0);
    return this;
  }
}
