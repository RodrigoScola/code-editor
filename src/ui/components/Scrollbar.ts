import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";

export class ScrollBarStyle extends ComponentStyle {
  private _thumb: string | null = null;
  private _track: string | null = null;

  thumb() {
    return this._thumb;
  }
  track() {
    return this._track;
  }
  display(): string {
    return this.track() || super.display();
  }

  setThumb(thumb: string | null) {
    this._thumb = thumb;
    return this;
  }

  setTrack(track: string | null) {
    this._track = track;
    return this;
  }
  static Create(): ScrollBarStyle {
    return new ScrollBarStyle()
      .setColor(colors.BLACK_FOREGROUND)
      .setBackgroundColor(colors.WHITE_BACKGROUND);
  }
}

export class ScrollBar {
  private _style: ScrollBarStyle = new ScrollBarStyle();

  private _offset: number = 0;
  private _size: number = 0;

  style() {
    return this._style;
  }
  setStyle(style: ScrollBarStyle) {
    this._style = style;
    return this;
  }

  setOffset(offset: number) {
    this._offset = offset;
    return this;
  }

  setSize(size: number) {
    this._size = size;
    return this;
  }
  offset() {
    return this._offset;
  }
  size() {
    return this._size;
  }
  static Thumb(
    track: number,
    visible: number,
    content: number,
    scroll: number,
  ) {
    const size = Math.max(1, Math.round((track * visible) / content));

    return {
      size: size,
      offset: Math.round(((track - size) * scroll) / (content - visible)),
    };
  }
}
