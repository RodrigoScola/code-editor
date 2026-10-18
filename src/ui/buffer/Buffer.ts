import { assert } from "../../assert.js";
import { splitLines } from '../../utils.js';

export class TextBuffer implements BufferLike {
  private lines: string[] = [];
  private listeners = new Set<() => void>();

  constructor(text?: string | undefined) {
    if (text) {
      this.lines = this.format(text);
    }
  }
  private format(text: string) {
    return splitLines(text)
  }
  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private changed() {
    for (const listener of this.listeners) {
      listener();
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
    if (ln === undefined) {
      return this;
    }
    this.lines[lineNumber] = content;
    this.changed();
    return this;
  }
  removeLine(line: number) {
    const at = Math.max(0, Math.min(line, this.lines.length - 1));

    this.lines.splice(at, 1);
    this.changed();
    return at;
  }

  public remove(line: number, column: number) {
    assert(
      line >= 0 && line < this.lines.length,
      `trying to remove line, invalid line number, got: ${line} `,
    );

    const current = this.lines[line];
    if (column < 0 || column >= current.length) {
      return;
    }

    this.lines[line] = current.slice(0, column) + current.slice(column + 1);
    this.changed();
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
    this.changed();
  }
  append(content: string = "") {
    this.lines.push(content);
    this.changed();
  }
  removeRange(start: number, end: number): string;
  removeRange(start: unknown, end: unknown): string {
    if (typeof start === "number" && typeof end === "number") {
      return this.removeIndex(start, end);
    }
    return "";
  }

  private removeIndex(start: number, end: number): string {
    const content = this.content();
    const removed = content.slice(start, end);

    this.lines = this.format(content.slice(0, start) + content.slice(end));

    this.changed();
    return removed;
  }

  insertAt(start: number, content: string) {
    const cn = this.content();
    const first = cn.slice(0, start);
    const result = first + content + cn.slice(start);

    this.lines = this.format(result);
    this.changed();
    return first.length;
  }

  insertLine(afterLine: number, content?: string) {
    const at = Math.max(0, Math.min(afterLine + 1, this.lines.length));
    this.lines.splice(at, 0, content || "");
    this.changed();
    return at;
  }
  index(ind: number): { line: number; character: number } {
    let line = 0;
    let char = 0;

    const content = this.content();

    for (let i = 0; i < content.length; i++) {
      const letter = content.at(i);
      if (!letter || i == ind) {
        break;
      }
      if (letter.includes("\n")) {
        line++;
        char = 0;
      } else {
        char++;
      }
    }

    return {
      line: line,
      character: char,
    };
  }

  offsetOf(line: number, column: number): number {
    let offset = 0;
    for (let i = 0; i < line; i++) {
      offset += (this.at(i) ?? "").length + 1; // +1 for the "\n"
    }
    offset += Math.min(column, (this.at(line) ?? "").length);
    return offset;
  }
}
