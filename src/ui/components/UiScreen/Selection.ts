import colors from "../../colors/colors.js";
import { ComponentStyle } from "../../styles/ComponentStyles.js";
import { LayoutBounds } from "../../layout/LayoutBounds.js";

export class EditorSelection {
  private _anchor: Point = { x: 0, y: 0 };
  private _head: Point = { x: 0, y: 0 };

  styles: ComponentStyle = ComponentStyle.Create().setBackgroundColor(
    colors.ORANGE,
  );

  bounds(buffer: BufferLike): LayoutBounds[] {
    const bounds: LayoutBounds[] = [];
    const start = this.start();
    const end = this.end();

    for (let y = start.y; y <= end.y; y++) {
      const content = buffer.at(y) ?? "";

      const from = y === start.y ? start.x : 0;
      const to = y === end.y ? end.x : content.length;

      if (to <= from) continue;

      bounds.push(
        LayoutBounds.Create()
          .setX(from)
          .setY(y)
          .setWidth(to - from)
          .setHeight(1),
      );
    }

    return bounds;
  }

  constructor(anchor: Point, head: Point) {
    this._anchor = anchor;
    this._head = head;
  }

  start() {
    return comparePoints(this.anchor(), this.head()) <= 0
      ? this.anchor()
      : this.head();
  }
  end(): Point {
    return comparePoints(this.anchor(), this.head()) <= 0
      ? this.head()
      : this.anchor();
  }

  setAnchor(nval: Point) {
    this._anchor = nval;
    return this;
  }

  setHead(nval: Point) {
    this._head = nval;
    return this;
  }

  head() {
    return this._head;
  }
  anchor() {
    return this._anchor;
  }

  isEmpty(): boolean {
    const start = this.start();
    const end = this.end();

    return start.x == end.x && start.y == end.y;
  }
  contains(point: Point): boolean {
    const start = this.start();
    const end = this.end();

    if (point.y < start.y || point.y > end.y) return false;
    if (point.y === start.y && point.x < start.x) return false;
    if (point.y === end.y && point.x >= end.x) return false;

    return true;
  }

  isReversed(): boolean {
    const start = this._anchor;
    const end = this._head;

    if (start.y > end.y) {
      return true;
    }

    if (end.x < start.x) {
      return true;
    }

    return false;
  }
  lines(): [number, number] {
    const start = this.start();
    const end = this.end();
    return [start.y, end.y];
  }
  text(buffer: BufferLike): string {
    const start = this.start();
    const end = this.end();

    let content: string[] = [];
    const maxIterations = Math.min(end.y, buffer.count());

    for (let i = start.y; i <= maxIterations; i++) {
      const line = buffer.at(i);
      if (!line) {
        break;
      }

      if (start.y === maxIterations) {
        content.push(line.slice(start.x, end.x));
        break;
      }
      if (start.y === i) {
        // first line
        content.push(line.slice(start.x));
      } else if (i === maxIterations) {
        // last line
        content.push(line.slice(0, end.x));
      } else {
        // middle lines
        content.push(line);
      }
    }
    return content.join("\n");
  }

  bufferPosition(buffer: BufferLike): { start: number; end: number } {
    const start = this.start();

    let startInd = 0;

    for (let i = 0; i < start.y; i++) {
      let line = buffer.at(i) || "";
      startInd += line.length;
    }
    startInd += (buffer.at(start.y) || "").slice(0, start.x).length;

    const end = startInd + this.text(buffer).length;

    return { start: startInd, end: end };
  }
}

function comparePoints(a: Point, b: Point): number {
  if (a.y !== b.y) {
    return a.y - b.y;
  }
  return a.x - b.x;
}
