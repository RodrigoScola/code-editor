import { TextBuffer } from "../ui/buffer/Buffer.js";
import colors from "../ui/colors.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";
import { ViewPort } from "../ui/windows/viewport.js";

export class Cursor {
  prefferedColumn: number = 0;
  line: number = 0;
  column: number = 0;
  style: ComponentStyles = ComponentStyle.Create()
    .setBackgroundColor(colors.RED_BACKGROUND)
    .setColor(colors.WHITE_FOREGROUND)
    .setBold(true);

  ensureCursorVisible(viewPort: ViewPort) {
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
    this.line = Math.min(this.line + 1, buffer.count() - 1);

    let nextLinePos = this.prefferedColumn;

    const line = buffer.at(this.line);
    if (line) {
      nextLinePos = line.length - 1;
    }

    this.column = Math.min(this.prefferedColumn, nextLinePos);
  }

  moveUp(buffer: BufferLike) {
    this.line = Math.max(this.line - 1, 0);

    let nextLinePos = this.prefferedColumn;

    const line = buffer.at(this.line);
    if (line) {
      nextLinePos = line.length - 1;
    }

    this.column = Math.min(this.prefferedColumn, nextLinePos);
  }
  moveLeft(buffer: TextBuffer) {
    this.column = Math.max(this.column - 1, 0);
  }
  moveRight(buffer: TextBuffer) {
    let bufferLine = buffer.at(this.line)?.length;
    if (bufferLine) {
      bufferLine -= 1;
    }

    const lineLength = bufferLine ?? this.column + 1;

    this.column = Math.min(this.column + 1, Math.max(lineLength, 0));

    this.prefferedColumn = this.column;
  }
}
