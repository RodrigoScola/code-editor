import { assert } from "../assert.js";
import { Canvas } from "../ui/canvas.js";
import colors from "../ui/colors.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { ViewPort } from "../ui/windows/viewport.js";
import { EditorSelection } from "./Selection.js";
import { TextEditorWindow } from "./windows/EditorWindow.js";

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

  constructor(private editor: TextEditorWindow) {}

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
    const editor = this.editor;

    const layout = editor.view().contentLayout();

    const relative = canvas.applyRelative(
      this.column,
      this.line - editor.view().viewport().firstLine,
      layout,
    );

    if (
      relative.x < layout.x ||
      relative.y < layout.y ||
      relative.x >= layout.x + layout.width ||
      relative.y >= layout.y + layout.height
    ) {
      return;
    }

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
    const buffer = this.editor.buffer();

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
    if (line) {
      this.style.setDisplay(line[this.column]);
    }
  }

  moveUp() {
    const buffer = this.editor.buffer();

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
    if (line) {
      this.style.setDisplay(line[this.column]);
    }
  }
  moveLeft() {
    this.column = Math.max(this.column - 1, 0);
  }
  moveRight() {
    const buffer = this.editor.buffer();

    const line = buffer.at(this.line);

    let bufferLine = line?.length;

    if (bufferLine) {
      bufferLine -= 1;
    }

    const lineLength = bufferLine ?? this.column + 1;

    this.column = Math.min(this.column + 1, Math.max(lineLength, 0));

    this.prefferedColumn = this.column;

    if (this.selection) this.updateSelection();

    if (line) {
      this.style.setDisplay(line[this.column]);
    }
  }
  reset() {
    this.line = 0;
    this.column = 0;
    this.prefferedColumn = 0;
  }
}
