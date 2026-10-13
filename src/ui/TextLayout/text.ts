import { assert } from "../../assert.js";
import { TextBuffer } from "../buffer/Buffer.js";
import { time } from "node:console";
import { DisplayComponent } from "../components/displayComponent.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";

export type OverflowTypes = "wrap" | "clip" | "visible";

type WrapTypes = "character" | "word";
export type TextAlign = "left" | "right" | "center";

class TextLayoutOptions {
  private _overflow: OverflowTypes = "wrap";
  private _align: TextAlign = "left";
  private _justify: boolean = false;

  private _lineWidth?: number;

  justify() {
    return this._justify;
  }
  setJustify(val: boolean) {
    this._justify = val;
    return this;
  }

  align() {
    return this._align;
  }
  setAlign(align: TextAlign) {
    this._align = align;
    return this;
  }

  overflow() {
    return this._overflow;
  }
  setOverflow(val: OverflowTypes) {
    this._overflow = val;
    return this;
  }
  lineWidth() {
    return this._lineWidth;
  }
  setLineWidth(val: number | undefined) {
    this._lineWidth = val;
    return this;
  }
}

class VisualLine {
  private _content: string = "";
  private _start: number = 0;
  private _end: number = 0;
  private _x: number = 0;
  private _y: number = 0;

  content() {
    return this._content;
  }
  setContent(str: string) {
    this._content = str;
    return this;
  }
  start() {
    return this._start;
  }
  setStart(val: number) {
    this._start = val;
    return this;
  }
  height() {
    return 1;
  }

  width() {
    return this.content().length;
  }
  y() {
    return this._y;
  }
  setY(val: number) {
    this._y = val;
    return this;
  }

  x() {
    return this._x;
  }
  setX(val: number) {
    this._x = val;
    return this;
  }

  end() {
    return this._end;
  }
  setEnd(val: number) {
    this._end = val;
    return this;
  }
}

export class TextLayout implements BufferLike {
  private _options: TextLayoutOptions = new TextLayoutOptions();
  private _dirty: boolean = false;

  private _lines: VisualLine[] = [];

  constructor(private _parent?: DisplayComponent) {}
  at(line: number): string | undefined {
    return this.lines().at(line)?.content();
  }

  removeRange(start: number, end: number): string {
    const removed = this.buffer().removeRange(start, end);
    this.changed();
    return removed;
  }
  insertAt(start: number, content: string) {
const result =     this.buffer().insertAt(start, content);
    this.changed();
    return result
  }
  index(ind: number): { line: number; character: number; } {
    return this.buffer().index(ind)
  }
  offsetOf(line: number, column: number): number {
    return this.buffer().offsetOf(line, column)
  }

  count(): number {
    return this.lines().length;
  }

  setParent(parent: DisplayComponent) {
    this._parent = parent;
    return this;
  }

  parent() {
    return this._parent;
  }

  options() {
    return this._options;
  }

  private _buffer: TextBuffer = new TextBuffer();

  buffer() {
    return this._buffer;
  }

  // buffer edits must re-run layout, otherwise the cached visual lines go stale.
  // the default buffer needs this too: callers often edit it without setBuffer()
  private _unsubscribe: () => void = this.watch(this._buffer);

  private watch(buffer: TextBuffer) {
    return buffer.onChange(() => this.changed());
  }

  // a new buffer or a new wrapping option changes the lines, so the view
  // has to be laid out (and its text wrapped) again
  private changed() {
    this.parent()?.setDirty(true);
  }

  setBuffer(buffer: TextBuffer) {
    this._unsubscribe();
    this._buffer = buffer;
    this._unsubscribe = this.watch(buffer);
    this.changed();

    const parentWidth = this.parent()?.contentLayout().width ?? 0;

    this._lines = this.processBuffer(
      this._buffer,
      Math.max(parentWidth, this.maxLineLength(buffer)),
    );

    return this;
  }
  private maxLineLength(buffer: BufferLike) {
    let max = 0;
    for (let i = 0; i < buffer.count(); i++) {
      const ln = buffer.at(i);
      max = Math.max(ln?.length || 0, max);
    }

    return max;
  }

  private processString(
    currentLine: string,
    availableWidth: number,
    allLines: VisualLine[],
  ) {
    let startAt = 0;
    const lines: VisualLine[] = [];

    while (startAt < currentLine.length) {
      let endAt =
        startAt + Math.min(availableWidth, currentLine.length - startAt);

      // Don't wrap this line.
      if (this.overflow() === "visible") {
        endAt = currentLine.length;
      }

      const line = new VisualLine();

      line.setContent(currentLine.slice(startAt, endAt));

      if (this.justify()) {
        this.justifyLine(line, allLines.at(-1));
      }

      // allLines only grows once this buffer line is done, so count the
      // pieces wrapped so far too
      line
        .setY(allLines.length + lines.length)
        .setStart(startAt)
        .setEnd(endAt);

      if (this.align() === "left") {
        line.setX(0);
      } else if (this.align() === "center") {
        const width = this.lineWidth() ?? availableWidth;

        line.setX(Math.floor(width / 2) - Math.floor(line.width() / 2));
      } else if (this.align() === "right") {
        const width = this.lineWidth() ?? availableWidth;

        line.setX(width - line.width());
      }

      lines.push(line);

      // `visible` means don't wrap.
      if (this.overflow() === "visible") {
        break;
      }

      // `clip` means don't wrap either.
      // The renderer/viewport should handle clipping.
      if (this.overflow() === "clip") {
        break;
      }

      // Make absolutely sure the loop progresses.
      if (endAt <= startAt) {
        throw new Error(
          `TextLayout failed to make progress: ${startAt} -> ${endAt}`,
        );
      }

      startAt = endAt;
    }
    return lines;
  }
  processBuffer(buffer: BufferLike, availableWidth: number) {
    let at = 0;
    const visualLines: VisualLine[] = [];

    while (at < buffer.count()) {
      const str = buffer.at(at) ?? "";

      // Empty buffer line still needs to produce a visual line.
      if (str.length === 0) {
        const line = new VisualLine();

        line
          .setContent("")
          .setStart(0)
          .setEnd(0)
          .setY(visualLines.length)
          .setX(0);

        visualLines.push(line);
        at++;
        continue;
      }

      for (const line of this.processString(str, availableWidth, visualLines)) {
        visualLines.push(line);
      }

      at++;
    }
    return visualLines;
  }

  measure(bounds: LayoutBounds) {
    const content = this.buffer();

    this._lines = [];

    if (content.count() === 0) {
      return;
    }

    const maxW = Math.min(this.lineWidth() ?? Infinity, bounds.width);

    // We cannot lay out anything without horizontal space.
    if (maxW <= 0) {
      return;
    }
    this._lines = this.processBuffer(this.buffer(), maxW);
  }
  justifyLine(line: VisualLine, previous: VisualLine | undefined) {
    if (!previous) return;

    const difference = previous.width() - line.width();

    const spaces = Math.max((line.content().match(/ /g) || []).length, 1);

    const each = Math.max(Math.round(difference / spaces), 1);

    line.setContent(line.content().replaceAll(" ", " ".repeat(each)));
  }

  lines(): VisualLine[] {
    return this._lines;
  }

  layout(): LayoutBounds {
    let maxW = 0;

    for (const line of this.lines()) {
      const clamped = this.lineWidth();
      if (
        (this.overflow() === "wrap" || this.overflow() === "clip") &&
        clamped
      ) {
        assert(line.width() <= clamped, "width cannot be greater than set max");
      }
      maxW = Math.max(maxW, line.width());
    }

    return LayoutBounds.Create()
      .setHeight(this.lines().length)
      .setWidth(maxW)
      .setX(this.lines().at(0)?.x() || 0)
      .setY(this.lines().at(0)?.y() || 0);
  }

  getTextPosition(x: number, y: number): number {
    return 0;
  }

  getCoordinates(position: number): Point {
    return {
      x: 0,
      y: 0,
    };
  }

  getLineAt(y: number): VisualLine | undefined {
    for (const line of this.lines()) {
      if (line.y() === y) {
        return line;
      }
    }
  }

  getLineForPosition(position: number): VisualLine | undefined {
    return new VisualLine();
  }

  getColumnForPosition(position: number): number {
    return 0;
  }

  invalidate(): void {}

  isDirty(): boolean {
    return this._dirty;
  }
  overflow() {
    return this.options().overflow();
  }
  setOverflow(val: OverflowTypes) {
    this.options().setOverflow(val);
    this.changed();
    return this;
  }
  lineWidth(): number | undefined {
    return this.options().lineWidth();
  }
  setLineWidth(val: number | undefined) {
    this.options().setLineWidth(val);
    this.changed();
    return this;
  }

  setText(text: string) {
    this.setBuffer(new TextBuffer(text));
    return this;
  }
  align() {
    return this.options().align();
  }
  setAlign(t: TextAlign) {
    this.options().setAlign(t);
    this.changed();
    return this;
  }
  justify() {
    return this.options().justify();
  }
  setJustify(val: boolean) {
    this.options().setJustify(val);
    this.changed();
    return this;
  }
  height() {
    return this._lines.length;
  }
  content(): string {
    return this.lines().join("\n");
  }
  width() {
    let maxW: number = 0;
    for (const line of this.lines()) {
      const clamped = this.lineWidth();
      if (
        (this.overflow() === "wrap" || this.overflow() === "clip") &&
        clamped
      ) {
        assert(line.width() <= clamped, "width cannot be greater than set max");
      }
      maxW = Math.max(maxW, line.width());
    }
    return maxW;
  }
}
