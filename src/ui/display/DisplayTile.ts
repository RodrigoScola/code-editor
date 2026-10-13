import { ComponentStyle } from "../ComponentStyles.js";

import { ObjectPool } from "../../ObjectPool.js";

export class DisplayTile {
  private static Pool: ObjectPool<DisplayTile> = new ObjectPool(
    () => new DisplayTile(),
  );
  private _x: number = 0;
  private _y: number = 0;
  private _styles: ComponentStyle = ComponentStyle.Create();

  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  reset() {
    this._x = 0;
    this._y = 0;
    this._styles = ComponentStyle.Create();
    return this;
  }

  setX(x: number) {
    this._x = x;
    return this;
  }
  get styles() {
    return this._styles;
  }
  setY(y: number) {
    this._y = y;
    return this;
  }
  setStyles(styles: ComponentStyle) {
    this._styles = styles;
    return this;
  }

  static Create(x: number = 0, y: number = 0) {
    return DisplayTile.Pool.get().setX(x).setY(y);
  }
  clone() {
    return DisplayTile.Create()
      .setStyles(this._styles)
      .setX(this._x)
      .setY(this._y);
  }
  copy(tile: DisplayTile) {
    return this.setStyles(tile._styles).setX(tile.x).setY(tile.y);
  }
  dispose() {
    DisplayTile.Pool.retrieve(this.reset());
  }
}
