import colors from "../colors.js";
import { DisplayComponent, parseSize } from "../display/displayComponent.js";
import { ScrollBar, ScrollBarStyle } from "../components/Scrollbar.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { LayoutEngine } from "./layout.js";
import { LayoutBounds } from "./LayoutBounds.js";
import { LayoutDimensions } from "./LayoutDimensions.js";
import {
  ContentAlign,
  LayoutStyle,
  OverflowType,
  WrapStyle,
} from "./layoutStyle.js";
import { Padding } from "./padding.js";

export class ComponentLayoutFns {
  private readonly _layoutStyle: LayoutStyle;

  private s: ComponentStyle;

  private _dirty: boolean = true;

  constructor() {
    this._layoutStyle = new LayoutStyle();

    this.s = ComponentStyle.Create()
      .setBackgroundColor(colors.BACKGROUND_OFF)
      .setColor(colors.FOREGROUND_OFF);
  }

  private pr: DisplayComponent | null = null;

  parent(): DisplayComponent | null {
    return this.pr;
  }

  setParent(parent: DisplayComponent | null): this {
    this.pr = parent;
    return this;
  }

  positionMode(): PositionMode {
    return this.layoutStyle().position();
  }

  setPositionMode(position: PositionMode): this {
    this.layoutStyle().setPosition(position);
    this.setDirty(true);
    return this;
  }

  direction(): DisplayDirection {
    return this.layoutStyle().direction();
  }

  setDirection(direction: DisplayDirection): this {
    this.layoutStyle().setDirection(direction);
    this.setDirty(true);
    return this;
  }

  startX(): Size {
    return this.layoutStyle().startX();
  }

  setStartX(value: Size): this {
    this.layoutStyle().setStartX(value);
    this.setDirty(true);
    return this;
  }

  startY(): Size {
    return this.layoutStyle().startY();
  }

  setStartY(value: Size): this {
    this.layoutStyle().setStartY(value);
    this.setDirty(true);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Dirty
  // ---------------------------------------------------------------------------

  dirty(): boolean {
    return this._dirty;
  }

  setDirty(value: boolean): this {
    this._dirty = value;

    if (value && this.parent()) {
      this.parent()!.setDirty(true);
    }

    return this;
  }

  layout(): LayoutBounds {
    return this._layoutStyle.layout();
  }

  setLayout(layout: LayoutBounds): this {
    this._layoutStyle.setLayout(layout);

    return this;
  }
  layoutStyle() {
    return this._layoutStyle;
  }

  display() {
    return this.layoutStyle().display();
  }
  setDisplay(dp: DisplayTypes) {
    this.layoutStyle().setDisplay(dp);
    this.setDirty(true);
    return this;
  }
  wrap() {
    return this.layoutStyle().wrap();
  }
  setWrap(val: WrapStyle) {
    this.layoutStyle().setWrap(val);
    this.setDirty(true);
    return this;
  }
  justifyContent() {
    return this._layoutStyle.justifyContent();
  }
  setJustifyContent(val: ContentAlign) {
    this._layoutStyle.setJustifyContent(val);
    this.setDirty(true);
    return this;
  }
  alignContent() {
    return this.layoutStyle().alignContent();
  }
  setAlignContent(val: ContentAlign) {
    this.layoutStyle().setAlignContent(val);
    this.setDirty(true);
    return this;
  }
  gap() {
    return this._layoutStyle.gap();
  }
  setGap(val: number) {
    this._layoutStyle.setGap(val);
    this.setDirty(true);
    return this;
  }

  width(): Size {
    return this._layoutStyle.width();
  }

  setWidth(width: Size): this {
    this.layoutStyle().setWidth(width);
    this.setDirty(true);
    return this;
  }

  height(): Size {
    return this.layoutStyle().height();
  }

  setHeight(height: Size): this {
    this.layoutStyle().setHeight(height);
    this.setDirty(true);
    return this;
  }

  maxWidth(): number | null {
    return this.layoutStyle().maxWidth();
  }

  setMaxWidth(maxWidth: number | null): this {
    this.layoutStyle().setMaxWidth(maxWidth);
    this.setDirty(true);
    return this;
  }

  maxHeight(): number | null {
    return this.layoutStyle().maxHeight();
  }

  setMaxHeight(maxHeight: number | null): this {
    this.layoutStyle().setMaxHeight(maxHeight);
    this.setDirty(true);
    return this;
  }

  margin(): Insets {
    return this.layoutStyle().margin();
  }

  setMargin(margin: Insets): this {
    this.layoutStyle().setMargin(margin);
    this.setDirty(true);
    return this;
  }
  setMarginLeft(n: number) {
    this.layoutStyle().margin().left = n;
    this.setDirty(true);
    return this;
  }

  setMarginRight(n: number) {
    this.layoutStyle().margin().right = n;
    this.setDirty(true);
    return this;
  }

  setMarginTop(n: number) {
    this.layoutStyle().margin().top = n;
    this.setDirty(true);
    return this;
  }

  setMarginBottom(n: number) {
    this.layoutStyle().margin().bottom = n;
    this.setDirty(true);
    return this;
  }
  padding(): Padding {
    return this.layoutStyle().padding();
  }

  setPadding(padding: Padding): this {
    this.layoutStyle().setPadding(padding);
    this.setDirty(true);
    return this;
  }

  setPaddingLeft(left: number) {
    this.padding().setLeft(left);
    this.setDirty(true);
    return this;
  }

  setPaddingTop(val: number) {
    this.padding().setTop(val);
    this.setDirty(true);
    return this;
  }
  setPaddingBottom(bottom: number) {
    this.padding().setBottom(bottom);
    this.setDirty(true);
    return this;
  }
  setPaddingRight(right: number) {
    this.padding().setRight(right);
    this.setDirty(true);
    return this;
  }
  setPaddingHorizontal(val: number) {
    this.setPaddingLeft(val);
    this.setPaddingRight(val);
    this.setDirty(true);
    return this;
  }
  setPaddingVertical(val: number) {
    this.setPaddingTop(val);
    this.setPaddingBottom(val);

    this.setDirty(true);
    return this;
  }
  overflow() {
    return this.layoutStyle().overflow();
  }
  setOverflow(type: OverflowType) {
    this.layoutStyle().setOverflow(type);
    this.setDirty(true);
    return this;
  }

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
  // The style fill char is exposed as displayChar() since display() is the
  // layout display type.

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
