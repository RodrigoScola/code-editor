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
  ensureVisible(width: number, height: number) {
    if (this.visibleColumns <= 0) {
      this.visibleColumns = width;
    }
    if (this.visibleLines <= 0) {
      this.visibleLines = height;
    }
  }
  screenToBuffer(screenPosition: Point): Point {
    return {
      x: screenPosition.x + this.firstColumn,
      y: screenPosition.y + this.firstLine,
    };
  }
}
