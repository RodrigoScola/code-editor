import {
  JustifyContent,
  LayoutBounds,
  LayoutStyle,
  WrapStyle,
} from "../layout/layoutStyle.js";
import { DisplayComponent } from "./components.js";

export class ComponentLayoutFns {
  private readonly _layoutStyle: LayoutStyle;

  private _dirty: boolean = true;

  constructor() {
    this._layoutStyle = new LayoutStyle();
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
    return this;
  }
  wrap() {
    return this.layoutStyle().wrap();
  }
  setWrap(val: WrapStyle) {
    this.layoutStyle().setWrap(val);
    return this;
  }
  justifyContent() {
    return this._layoutStyle.justifyContent();
  }
  setJustifyContent(val: JustifyContent) {
    this._layoutStyle.setJustifyContent(val);
    return this;
  }
  gap() {
    return this._layoutStyle.gap();
  }
  setGap(val: number) {
    this._layoutStyle.setGap(val);
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

  padding(): Insets {
    return this.layoutStyle().padding();
  }

  setPadding(padding: Insets): this {
    this.layoutStyle().setPadding(padding);
    this.setDirty(true);
    return this;
  }

  setPaddingLeft(val: number) {
    this.padding().left = val;
    this.setDirty(true);
    return this;
  }

  setPaddingTop(val: number) {
    this.padding().top = val;
    this.setDirty(true);
    return this;
  }
  setPaddingBottom(val: number) {
    this.padding().bottom = val;
    this.setDirty(true);
    return this;
  }
  setPaddingRight(val: number) {
    this.padding().right = val;
    this.setDirty(true);
    return this;
  }
  setPaddingHorizontal(val: number) {
    this.setPaddingLeft(val);
    this.setPaddingRight(val);
    return this;
  }
  setPaddingVertical(val: number) {
    this.setPaddingTop(val);
    this.setPaddingBottom(val);
    return this;
  }
}
