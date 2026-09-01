export class LayoutStyle {
  private _width: Size = "auto";
  private _height: Size = "auto";

  private _maxWidth: number | null = null;
  private _maxHeight: number | null = null;

  private _margin: Insets = {
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
  };

  private _padding: Insets = {
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
  };

  private _position: PositionMode = "normal";
  private _direction: DisplayDirection = "vertical";

  width(): Size {
    return this._width;
  }

  setWidth(width: Size): this {
    this._width = width;
    return this;
  }

  height(): Size {
    return this._height;
  }

  setHeight(height: Size): this {
    this._height = height;
    return this;
  }

  maxWidth(): number | null {
    return this._maxWidth;
  }

  setMaxWidth(maxWidth: number | null): this {
    this._maxWidth = maxWidth;
    return this;
  }

  maxHeight(): number | null {
    return this._maxHeight;
  }

  setMaxHeight(maxHeight: number | null): this {
    this._maxHeight = maxHeight;
    return this;
  }

  margin(): Insets {
    return this._margin;
  }

  setMargin(margin: Insets): this {
    this._margin = margin;
    return this;
  }

  padding(): Insets {
    return this._padding;
  }

  setPadding(padding: Insets): this {
    this._padding = padding;
    return this;
  }

  position(): PositionMode {
    return this._position;
  }

  setPosition(position: PositionMode): this {
    this._position = position;
    return this;
  }

  direction(): DisplayDirection {
    return this._direction;
  }

  setDirection(direction: DisplayDirection): this {
    this._direction = direction;
    return this;
  }
}
