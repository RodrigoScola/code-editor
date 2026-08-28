import { Canvas } from "../ui/canvas.js";
import colors from "../ui/colors.js";
import { ComponentStyle } from "../ui/ComponentStyles.js";

export class EditorSelection {
  private _anchor: Point = { x: 0, y: 0 };
  private _head: Point = { x: 0, y: 0 };

  styles: ComponentStyles = ComponentStyle.Create().setBackgroundColor(
    colors.ORANGE_BACKGROUND,
  );

  constructor(anchor: Point, head: Point) {
    this._anchor = anchor;
    this._head = head;
  }

  startSelection() {
    return comparePoints(this.anchor(), this.head()) <= 0
      ? this.anchor()
      : this.head();
  }
  endSelection(): Point {
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
  getSelectionBounds(
    canvas: Canvas,
    layout: LayoutBounds,
    start: Point,
    end: Point,
    lines: string[],
  ): LayoutBounds[] {
    const bounds: LayoutBounds[] = [];

    for (let y = start.y; y <= end.y; y++) {
      const line = lines[y] ?? "";

      const from = y === start.y ? start.x : 0;
      const to = y === end.y ? end.x : line.length;

      if (to <= from) continue;

      const startPosition = canvas.applyRelative(from, y, layout, line);

      const endPosition = canvas.applyRelative(to, y, layout, line);

      bounds.push({
        x: startPosition.x,
        y: startPosition.y,
        width: endPosition.x - startPosition.x,
        height: 1,
      });
    }

    return bounds;
  }
}

function comparePoints(a: Point, b: Point): number {
  if (a.y !== b.y) {
    return a.y - b.y;
  }
  return a.x - b.x;
}
