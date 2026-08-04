import { assert } from "../assert.js";

export class TextBuffer {
  private lines: string[];

  constructor(text: string) {
    this.lines = text.split("\n");
  }
  public line(i: number) {
    assert(i >= 0, `invalid line number, got: ${i} `);
    return this.lines.at(i);
  }
  public lineCount() {
    return this.lines.length;
  }
  public add(line: number, column: number, ch: string) {
    assert(ch.length === 1, "cannot insert more than one character");

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
