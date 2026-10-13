import { ObjectPool } from "../../ObjectPool.js";

export class LayoutBounds {
  private static Pool: ObjectPool<LayoutBounds> = new ObjectPool(
    () => new LayoutBounds(),
  );
  private _x: number = 0;
  private _y: number = 0;
  private _width: number = 0;
  private _height: number = 0;

  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  reset() {
    this._height = 0;
    this._width = 0;
    this._x = 0;
    this._y = 0;
    return this;
  }

  setX(x: number) {
    this._x = x;
    return this;
  }
  setY(y: number) {
    this._y = y;
    return this;
  }

  setWidth(width: number) {
    this._width = width;
    return this;
  }

  setHeight(height: number) {
    this._height = height;
    return this;
  }
  static Create(
    width: number = 0,
    height: number = width,
    x: number = 0,
    y: number = 0,
  ) {
    return LayoutBounds.Pool.get()
      .setWidth(width)
      .setHeight(height)
      .setX(x)
      .setY(y);
  }
  clone() {
    return LayoutBounds.Create()
      .setHeight(this.height)
      .setWidth(this.width)
      .setX(this._x)
      .setY(this._y);
  }
  copy(bound: LayoutBounds) {
    return this.setHeight(bound.height)
      .setWidth(bound.width)
      .setX(bound.x)
      .setY(bound.y);
  }
  dispose() {
    LayoutBounds.Pool.retrieve(this.reset());
  }
  contains(bounds: LayoutBounds) {
    return LayoutBounds.Contains(this, bounds);
  }

  static Contains(cursor: LayoutBounds, bounds: LayoutBounds) {
    return (
      cursor.x >= bounds.x &&
      cursor.x < bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y < bounds.y + bounds.height
    );
  }
}
