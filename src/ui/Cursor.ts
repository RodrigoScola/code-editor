import { TextBuffer } from "./Buffer.js";
import colors from "./colors.js";

export class Cursor {
  prefferedColumn: number = 0;
  line: number = 0;
  column: number = 0;
  style: ComponentStyles = {
    backgroundColor: colors.RED_BACKGROUND,
    color: colors.WHITE_FOREGROUND,
  };
  moveDown(buffer: TextBuffer) {
    this.line = Math.min(this.line + 1, buffer.lineCount() - 1);

    this.column = Math.min(
      this.prefferedColumn,
      buffer.line(this.line)?.length ?? this.prefferedColumn,
    );
  }

  moveUp(buffer: TextBuffer) {
    this.line = Math.max(this.line - 1, 0);

    this.column = Math.min(
      this.prefferedColumn,
      buffer.line(this.line)?.length ?? this.prefferedColumn,
    );
  }
  moveLeft(buffer: TextBuffer) {
    this.column = Math.max(this.column - 1, 0);
  }
  moveRight(buffer: TextBuffer) {
    const lineLength = buffer.line(this.line)?.length ?? this.column + 1;

    this.column = Math.min(this.column + 1, Math.max(lineLength - 1, 0));

    this.prefferedColumn = this.column;
  }
}
