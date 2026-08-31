import { start } from "repl";
import { buffer } from "stream/consumers";
import { assert } from "../assert.js";
import { TextBuffer } from "../ui/buffer/Buffer.js";
import { Canvas } from "../ui/canvas.js";
import colors from "../ui/colors.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { ViewPort } from "../ui/windows/viewport.js";
import { EditorSelection } from "./Selection.js";
import { EditorWindow } from "./windows/EditorWindow.js";

export class Cursor {
  prefferedColumn: number = 0;
  line: number = 0;
  column: number = 0;
  style: ComponentStyles = ComponentStyle.Create()
    .setBackgroundColor(colors.RED_BACKGROUND)
    .setColor(colors.BRIGHT_WHITE_FOREGROUND);
  selection: EditorSelection | null = null;

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

  paint(
    canvas: Canvas,
    editor: EditorWindow,
    content: string | null | undefined,
  ) {
    const cl = editor.window.contentLayout();

    content ||= " ";

    const relativePosition = canvas.applyRelative(
      this.column,
      this.line - editor.window.viewport().firstLine,
      cl,
      content,
    );

    if (
      relativePosition.x < cl.x ||
      relativePosition.y < cl.y ||
      relativePosition.x >= cl.x + cl.width ||
      relativePosition.y >= cl.y + cl.height
    ) {
      return;
    }

    canvas.fillRect(
      relativePosition,
      this.style.setDisplay(content[this.column]),
    );
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
  moveDown(buffer: BufferLike) {
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

  moveUp(buffer: BufferLike) {
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
  moveLeft(buffer: TextBuffer) {
    this.column = Math.max(this.column - 1, 0);
  }
  moveRight(buffer: TextBuffer) {
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
}
