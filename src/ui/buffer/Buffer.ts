import { assert } from "../../assert.js";

export class TextBuffer implements BufferLike {
  private lines: string[] = [];

  constructor(text?: string | undefined) {
    if (text) {
      this.lines = text.split("\n");
    }
  }
  content() {
    return this.lines.join("\n");
  }
  public at(i: number) {
    assert(i >= 0, `invalid line number, got: ${i} `);
    return this.lines.at(i);
  }
  public count() {
    return this.lines.length;
  }
  update(lineNumber: number, content: string) {
    let ln = this.at(lineNumber);
    if (!ln) {
      return;
    }
    this.lines[lineNumber] = content;
  }
  removeLine(line: number) {
    const at = Math.max(0, Math.min(line, this.lines.length - 1));

    this.lines.splice(at, 1);
    return at;
  }

  public remove(line: number, column: number) {
    assert(
      line >= 0 && line < this.lines.length,
      `invalid line number, got: ${line} `,
    );

    const current = this.lines[line];
    if (column < 0 || column >= current.length) {
      return;
    }

    this.lines[line] = current.slice(0, column) + current.slice(column + 1);
  }
  public addLine(content: string) {
    this.lines.push(content);
  }
  public addCharacter(line: number, column: number, ch: string) {
    if (ch.length == 2) {
      assert(
        ch.includes(`\\`),
        `has to insert a valid character one at a time. got: ${ch} `,
      );
    } else if (ch.length == 1) {
      // success
    } else {
      assert(false, "cannot insert invalid character: " + ch);
    }

    while (this.lines.length <= line) {
      this.lines.push("");
    }

    const current = this.lines[line];

    const clamped = Math.max(0, Math.min(column, current.length));

    this.lines[line] = current.slice(0, clamped) + ch + current.slice(clamped);
  }
  newLine() {
    this.lines.push("");
  }
  insertLine(afterLine: number) {
    const at = Math.max(0, Math.min(afterLine + 1, this.lines.length));
    this.lines.splice(at, 0, "");
    return at;
  }
}
