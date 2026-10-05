import { ICONS } from "../../constants.js";
import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";

const borders = ICONS.borders;

export type BorderStyles =keyof typeof borders;

export class ComponentBorder {
  private _left: number = 0;
  private _right: number = 0;
  private _top: number = 0;
  private _bottom: number = 0;

  private displayStyle = borders.full;

  borderStyle() {
    return this.displayStyle;
  }

  setBorderSyle(st: BorderStyles) {
    this.displayStyle = borders[st];
    return this;
  }

  setParameter(nb: number) {
    this._bottom = this._top = this._left = this._right = nb;
    return this;
  }
  horizontal() {
    return this.left() + this.right();
  }

  vertical() {
    return this.top() + this.bottom();
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

  private s: ComponentStyle = new ComponentStyle();

  styles(): ComponentStyle {
    return this.s;
  }

  setStyles(sty: Partial<ComponentStyle>): this {
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

  // Inline style shortcuts — delegate to this.styles().
  // Named to match DisplayComponent (displayChar instead of display).

  displayChar(): string {
    return this.s.display();
  }
  setDisplayChar(nval: string): this {
    this.s.setDisplay(nval);
    return this;
  }

  isBold(): boolean {
    return this.s.isBold();
  }
  setBold(nval: boolean): this {
    this.s.setBold(nval);
    return this;
  }

  isHidden(): boolean {
    return this.s.isHidden();
  }
  setHidden(nval: boolean): this {
    this.s.setHidden(nval);
    return this;
  }

  isBlink(): boolean {
    return this.s.isBlink();
  }
  setBlink(nval: boolean): this {
    this.s.setBlink(nval);
    return this;
  }

  isInverse(): boolean {
    return this.s.isInverse();
  }
  setInverse(nval: boolean): this {
    this.s.setInverse(nval);
    return this;
  }

  isStrikeThrough(): boolean {
    return this.s.isStrikeThrough();
  }
  setStrikeThrough(nval: boolean): this {
    this.s.setStrikeThrough(nval);
    return this;
  }

  isUnderline(): boolean {
    return this.s.isUnderline();
  }
  setUnderline(nval: boolean): this {
    this.s.setUnderline(nval);
    return this;
  }

  isItalic(): boolean {
    return this.s.isItalic();
  }
  setItalic(nval: boolean): this {
    this.s.setItalic(nval);
    return this;
  }

  isDim(): boolean {
    return this.s.isDim();
  }
  setDim(nval: boolean): this {
    this.s.setDim(nval);
    return this;
  }

  backgroundColor(): string {
    return this.s.backgroundColor();
  }
  setBackgroundColor(newColor: string): this {
    this.s.setBackgroundColor(newColor);
    return this;
  }

  color(): string {
    return this.s.color();
  }
  setColor(newColor: string): this {
    this.s.setColor(newColor);
    return this;
  }
}
