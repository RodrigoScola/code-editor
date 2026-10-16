import { ComponentStyle } from "../ComponentStyles.js";

const THUMB = "#";
const TRACK = ".";

export class ScrollBarStyle extends ComponentStyle {
  private _thumb: string | null = THUMB;
  private _track: string | null = TRACK;

  private _thumbColor: string | null = null;
  private _trackColor: string | null = null;

  setThumbColor(color: string) {
    this._thumbColor = color;
    return this;
  }
  setTrackColor(color: string) {
    this._trackColor = color;
    return this;
  }
  thumbColor() {
    return this._thumbColor;
  }
  trackColor() {
    return this._trackColor;
  }

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
    return new ScrollBarStyle();
  }
  // not pooled like ComponentStyle.clone(): the pool only holds plain
  // ComponentStyles. The base fields are private, so through the setters
  clone(): ScrollBarStyle {
    const out = new ScrollBarStyle()
      .setThumb(this._thumb)
      .setTrack(this._track);

    out._thumbColor = this._thumbColor;
    out._trackColor = this._trackColor;

    out
      .setDisplay(super.display())
      .setBackgroundColor(this.backgroundColor())
      .setColor(this.color())
      .setBold(this.isBold())
      .setDim(this.isDim())
      .setItalic(this.isItalic())
      .setUnderline(this.isUnderline())
      .setStrikeThrough(this.isStrikeThrough())
      .setInverse(this.isInverse())
      .setBlink(this.isBlink())
      .setHidden(this.isHidden());

    return out;
  }
}

export class ScrollBar {
  private _style: ScrollBarStyle = new ScrollBarStyle();

  private _offset: number = 0;
  private _size: number = 0;

  height() {
    return 1;
  }
  width() {
    return 1;
  }

  style() {
    return this._style;
  }
  // fields left out keep their value. A new style each time, so a style
  // passed in isn't shared with (or changed by) the bar
  setStyle(sty: Partial<ScrollBarStyle>) {
    const current = this._style;

    this._style = new ScrollBarStyle()
      .setThumb(sty.thumb?.() ?? current.thumb())
      .setTrack(sty.track?.() ?? current.track());

    const thumbColor = sty.thumbColor?.() ?? current.thumbColor();
    if (thumbColor !== null) {
      this._style.setThumbColor(thumbColor);
    }
    const trackColor = sty.trackColor?.() ?? current.trackColor();
    if (trackColor !== null) {
      this._style.setTrackColor(trackColor);
    }

    this._style
      .setBackgroundColor(sty.backgroundColor?.() ?? current.backgroundColor())
      .setColor(sty.color?.() ?? current.color())
      .setBold(sty.isBold?.() ?? current.isBold())
      .setDim(sty.isDim?.() ?? current.isDim())
      .setItalic(sty.isItalic?.() ?? current.isItalic())
      .setUnderline(sty.isUnderline?.() ?? current.isUnderline())
      .setStrikeThrough(sty.isStrikeThrough?.() ?? current.isStrikeThrough())
      .setInverse(sty.isInverse?.() ?? current.isInverse())
      .setBlink(sty.isBlink?.() ?? current.isBlink())
      .setHidden(sty.isHidden?.() ?? current.isHidden());

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
