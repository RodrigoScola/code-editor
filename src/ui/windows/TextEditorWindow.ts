import { TextBuffer } from "../buffer/Buffer.js";
import { Canvas } from "../canvas.js";
import { DisplayComponent } from "../components.js";
import { Cursor } from "../Cursor.js";

// a tab is one buffer character but expands to multiple screen cells, so
// rendering and cursor placement need the expanded text / a column mapping
// rather than drawing the raw line 1:1
function expandTabs(line: string, tabWidth: number): string {
  let out = "";
  for (const ch of line) {
    if (ch === "\t") {
      out += " ".repeat(tabWidth - (out.length % tabWidth));
    } else {
      out += ch;
    }
  }
  return out;
}

function bufferColumnToScreenColumn(
  line: string,
  column: number,
  tabWidth: number,
): number {
  let screenCol = 0;
  const limit = Math.min(column, line.length);
  for (let i = 0; i < limit; i++) {
    if (line[i] === "\t") {
      screenCol += tabWidth - (screenCol % tabWidth);
    } else {
      screenCol += 1;
    }
  }
  return screenCol + Math.max(0, column - line.length);
}

export class TextEditorWindow extends DisplayComponent {
  buffer: TextBuffer;
  cursor: Cursor;

  tab_width: number = 4;

  constructor(buffer: TextBuffer) {
    super();
    this.buffer = buffer;
    this.cursor = new Cursor();
  }

  paint(canvas: Canvas): void {
    canvas.fillRect(this.contentLayout(), this.styles());

    for (let i = 0; i < this.buffer.lineCount(); i++) {
      const line = this.buffer.line(i);
      if (this.contentLayout().y + i >= this.contentLayout().height) {
        break;
      }
      if (!line) {
        continue;
      }
      canvas.drawText(
        this.contentLayout().x,
        this.contentLayout().y + i,
        expandTabs(line, this.tab_width),
        this.styles(),
      );
    }
    canvas.fillRect(this.applyRelative(this.cursor), this.cursor.style);
  }
  applyRelative(cursor: Cursor): LayoutBounds {
    const cl = this.contentLayout();
    const line = this.buffer.line(cursor.line) ?? "";

    return {
      height: 1,
      width: 1,
      x: cl.x + bufferColumnToScreenColumn(line, cursor.column, this.tab_width),
      y: cl.y + cursor.line,
    };
  }
}
