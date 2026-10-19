import { ObjectPool } from "../../ObjectPool.js";

export class WindowCanvasText {
  private static Pool: ObjectPool<WindowCanvasText> =
    new ObjectPool<WindowCanvasText>(() => new WindowCanvasText());
  private _x: number = 0;
  private _y: number = 0;
  private _text: string = "";

  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get text() {
    return this._text;
  }

  setX(x: number) {
    this._x = x;
    return this;
  }
  setY(y: number) {
    this._y = y;
    return this;
  }
  setText(text: string) {
    this._text = text;
    return this;
  }

  reset() {
    this._x = 0;
    this._y = 0;
    this._text = "";
    return this;
  }

  dispose() {
    return WindowCanvasText.Pool.retrieve(this.reset());
  }
  static Create() {
    return WindowCanvasText.Pool.get().reset();
  }
}
