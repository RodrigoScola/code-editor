import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";

export class ComponentBorder {
  private _left: number = 0;
  private _right: number = 0;
  private _top: number = 0;
  private _bottom: number = 0;

  setParameter(nb: number) {
    this._bottom = this._top = this._left = this._right = nb;
    return this;
  }

  left() {
    return this._left;
  }

  setLeft(val: number) {
    this._left = val;
    return this;
  }

  right() {
    return this._right;
  }

  setRight(val: number) {
    this._right = val;
    return this;
  }

  setTop(val: number) {
    this._top = val;
    return this;
  }

  setBottom(val: number) {
    this._bottom = val;
    return this;
  }

  top() {
    return this._top;
  }

  bottom() {
    return this._bottom;
  }

  private s: ComponentStyles = new ComponentStyle()
    .setBackgroundColor(colors.DARK_GRAY_BACKGROUND)
    .setDisplay("|");

  styles(): ComponentStyles {
    return this.s;
  }

  setStyles(sty: Partial<ComponentStyles>): this {
    this.s = ComponentStyle.Create()
      .setBackgroundColor(sty.backgroundColor?.() ?? this.s.backgroundColor())
      .setColor(sty.color?.() ?? this.s.color())
      .setBold(sty.isBold?.() ?? this.s.isBold())
      .setDim(sty.isDim?.() ?? this.s.isDim())
      .setItalic(sty.isItalic?.() ?? this.s.isItalic())
      .setUnderline(sty.isUnderline?.() ?? this.s.isUnderline())
      .setStrikeThrough(sty.isStrikeThrough?.() ?? this.s.isStrikeThrough())
      .setInverse(sty.isInverse?.() ?? this.s.isInverse())
      .setBlink(sty.isBlink?.() ?? this.s.isBlink())
      .setHidden(sty.isHidden?.() ?? this.s.isHidden());

    return this;
  }
}
