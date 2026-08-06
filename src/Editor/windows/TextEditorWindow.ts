import { text } from "node:stream/consumers";
import { Canvas } from "../../ui/canvas.js";
import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components.js";
import { Cursor } from "../Cursor.js";
import { Textdocument } from "../Documents/TextDocument.js";

export class ViewPort {
  firstLine: number = 0;
  firstColumn: number = 0;

  visibleLines: number = 0;
  visibleColumns: number = 0;

  bufferToViewPort(bufferPosition: Point): Point {
    return {
      y: bufferPosition.y - this.firstLine,
      x: bufferPosition.x - this.firstColumn,
    };
  }
  screenToBuffer(screenPosition: Point): Point {
    return {
      x: screenPosition.x + this.firstColumn,
      y: screenPosition.y + this.firstLine,
    };
  }
}

export class TextEditorWindow extends DisplayComponent {
  document: Textdocument;
  cursor: Cursor;
  viewPort: ViewPort = new ViewPort();

  constructor(document: Textdocument) {
    super();
    this.document = document;
    this.cursor = new Cursor();
  }

  paint(canvas: Canvas): void {
    const cl = this.contentLayout();

    canvas.fillRect(this.contentLayout(), this.styles());

    const firstLine = this.viewPort.firstLine;
    const lastLine = Math.min(
      firstLine + this.viewPort.visibleLines,
      this.document.buffer.lineCount(),
    );

    for (let lineNumber = firstLine; lineNumber < lastLine; lineNumber++) {
      const line = this.document.buffer.line(lineNumber);
      if (!line) {
        continue;
      }

      const screenY = cl.y + (lineNumber - firstLine);

      canvas.drawText(cl.x, screenY, line, this.styles());
    }

    const cursorLine = this.document.buffer.line(this.cursor.line);
    if (!cursorLine) {
      return;
    }

    const cursor = canvas.applyRelative(
      this.cursor.column,
      this.cursor.line - this.viewPort.firstLine,
      cl,
      cursorLine,
    );

    if (
      cursor.x < cl.x ||
      cursor.y < cl.y ||
      cursor.x >= cl.x + cl.width ||
      cursor.y >= cl.y + cl.height
    ) {
      return;
    }

    canvas.fillRect(
      cursor,

      this.cursor.style,
    );
  }
  onEvent(event: EditorEvents): void {
    super.onEvent(event);
    // todo: when adding config, this is needing a change
    if (event.name !== "editorModeChange") {
      return;
    }

    if (event.mode === "normal") {
      this.cursor.style.backgroundColor = colors.RED_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    } else if (event.mode === "insert") {
      this.cursor.style.backgroundColor = colors.GREEN_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    } else if (event.mode === "visual") {
      this.cursor.style.backgroundColor = colors.CYAN_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    } else {
      this.cursor.style.backgroundColor = colors.RED_BACKGROUND;
      this.cursor.style.color = colors.WHITE_FOREGROUND;
    }
  }
}
