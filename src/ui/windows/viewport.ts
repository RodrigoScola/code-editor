export class ViewPort implements ViewPorts {
  firstLine: number = 0;
  firstColumn: number = 0;

  visibleLines: number = Infinity;
  visibleColumns: number = Infinity;

  bufferToViewPort(bufferPosition: Point): Point {
    return {
      y: bufferPosition.y - this.firstLine,
      x: bufferPosition.x - this.firstColumn,
    };
  }
  ensureVisible(width: number, height: number) {
    this.visibleColumns = width;
    this.visibleLines = height;
  }
  screenToBuffer(screenPosition: Point): Point {
    return {
      x: screenPosition.x + this.firstColumn,
      y: screenPosition.y + this.firstLine,
    };
  }
}
