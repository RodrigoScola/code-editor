import { ObjectPool } from "../../ObjectPool.js";

export class Padding {
  private static Pool: ObjectPool<Padding> = new ObjectPool<Padding>(
    () => new Padding(),
  );

  static Create() {
    return this.Pool.get();
  }

  private _left: number = 0;
  private _right: number = 0;
  private _top: number = 0;
  private _bottom: number = 0;

  get left() {
    return this._left;
  }

  get right() {
    return this._right;
  }

  get top() {
    return this._top;
  }

  get bottom() {
    return this._bottom;
  }
  get vertical() {
    return this.bottom + this.top;
  }
  get horizontal() {
    return this.left + this.right;
  }
  setLeft(left: number) {
    this._left = left;
    return this;
  }
  setRight(right: number) {
    this._right = right;
    return this;
  }

  setTop(top: number) {
    this._top = top;
    return this;
  }
  setBottom(bottom: number) {
    this._bottom = bottom;
    return this;
  }
  setVertical(amount: number) {
    return this.setBottom(amount).setTop(amount);
  }
  setHorizontal(amount: number) {
    return this.setLeft(amount).setRight(amount);
  }
  dispose() {
    return Padding.Pool.retrieve(this);
  }
  reset() {
    return this.setBottom(0).setLeft(0).setRight(0).setTop(0);
  }
  clone() {
    return Padding.Pool.get()
      .setBottom(this.bottom)
      .setTop(this.top)
      .setRight(this.right)
      .setLeft(this.left);
  }
}
