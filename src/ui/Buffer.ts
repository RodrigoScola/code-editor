import { assert } from "../assert.js";

export class TextBuffer {
  private lines: string[];

  constructor(text: string) {
    this.lines = text.split("\n");
  }
  public line(i: number) {
    assert(i > 0, `invalid line number, got: ${i} `);
    return this.lines.at(i);
  }
  public lineCount() {
    return this.lines.length;
  }
}
