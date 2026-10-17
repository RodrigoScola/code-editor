import { ObjectPool } from "../../ObjectPool.js";


export class ColorOptions {
  static Pool: ObjectPool<ColorOptions> = new ObjectPool(
    () => new ColorOptions(),
  );
  private _red: number = 0;
  private _green: number = 0;
  private _blue: number = 0;
  private _alpha: number = 1;

  private _type: ColorOptionType = "rgb";
  setType(type: ColorOptionType) {
    this._type = type;
    return this;
  }
  get type() {
    return this._type;
  }

  setRed(red: number) {
    this._red = red;
    return this;
  }
  setGreen(green: number) {
    this._green = green;
    return this;
  }
  setBlue(blue: number) {
    this._blue = blue;
    return this;
  }
  get red() {
    return this._red;
  }
  get r() {
    return this._red;
  }
  get green() {
    return this._green;
  }
  get g() {
    return this._green;
  }
  get blue() {
    return this._blue;
  }
  get b() {
    return this._blue;
  }
  get a() {
    return this._alpha;
  }
  get alpha() {
    return this._alpha;
  }
  setAlpha(alpha: number) {
    this._alpha = alpha;
    return this;
  }

  dispose() {
    return ColorOptions.Pool.retrieve(this);
  }

  // always sets alpha: a pooled object handed out again must not keep the
  // last one (and `if (a)` would skip a = 0)
  static Create(r: number = 0, g: number = 0, b: number = 0, a = 1) {
    return ColorOptions.Pool.get().setRed(r).setGreen(g).setBlue(b).setAlpha(a);
  }
}
