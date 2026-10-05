import { assert } from "../assert.js";
import { Canvas } from "../ui/canvas.js";
import colors from "../ui/colors.js";
import { DisplayComponent } from "../ui/components/displayComponent.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { LayoutEngine } from "../ui/layout/layout.js";
import { LayoutDimensions } from "../ui/layout/LayoutDimensions.js";
import { LayoutBounds } from "../ui/layout/layoutStyle.js";
import { ViewPort } from "../ui/windows/viewport.js";
import { EditorSelection } from "./Selection.js";

export class Cursor {
  prefferedColumn: number = 0;


  width: number = 1;
  height: number = 1;

  line: number = 0;
  column: number = 0;
  style: ComponentStyle = ComponentStyle.Create()
    .setBackgroundColor(colors.RED_BACKGROUND)
    .setColor(colors.BRIGHT_WHITE_FOREGROUND);

  selection: EditorSelection | null = null;
  private _buffer?: BufferLike;
  private _view?: DisplayComponent;

  setBuffer(buffer: BufferLike) {
    this._buffer = buffer;
    return this;
  }
  view() {
    return this._view;
  }
  setView(vp: DisplayComponent) {
    this._view = vp;
    return this;
  }
  layout(): LayoutBounds {
    return {
      height: this.height,
      width: this.width,
      x: this.column,
      y: this.line,
    };
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

  paint(canvas: Canvas) {
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

    relative.height = this.height;
    relative.width = this.width;

    const content = canvas.getRow(relative.y);
    assert(content, "invalid display row");

    const str = content.map((tile) => tile.styles.display());

    let final = "";
    for (let i = relative.x; i < relative.x + relative.width; i++) {
      final += str[i];
    }

    canvas.drawText(relative, final, this.style);
  }

  paintSelection(canvas: Canvas) {
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
      return;
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
  }

  moveUp() {
    const buffer = this._buffer;
    if (!buffer) {
      return;
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
  }
  moveLeft() {
    this.column = Math.max(this.column - 1, 0);
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
  }

  goToLineEnd() {
    const buffer = this._buffer;
    if (!buffer) {
      return;
    }

    const currentLine = buffer.at(this.line);
    assert(currentLine !== undefined, `invalid current line: ${this.line}`);

    this.prefferedColumn = this.column = currentLine.length - 1;
  }
}
