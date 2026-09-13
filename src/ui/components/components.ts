import { assert } from "../../assert.js";

import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { LayoutEngine } from "../layout/layout.js";
import { LayoutDimensions } from "../layout/LayoutDimensions.js";
import {
  DisplayDirection,
  Insets,
  LayoutStyle,
  PositionMode,
} from "../layout/layoutStyle.js";
import { ComponentBorder } from "./border.js";

export class DisplayComponent {
  private static ID = 0;

  private readonly id: number;
  private readonly _layoutStyle: LayoutStyle;

  private ind = 0;
  private vs = true;

  private nm: string | null | undefined;

  private _dirty: boolean = true;

  private _focusable = false;
  private _text: string | undefined;

  private _measuredSize: MeasuredSize = {
    height: 0,
    width: 0,
  };

  private childs: DisplayComponent[] = [];
  private pr: DisplayComponent | null = null;

  private s: ComponentStyle;

  private _border: ComponentBorder = new ComponentBorder();

  private paintHook: ((canvas: Canvas) => void) | null = null;
  private prePaintHook: ((canvas: Canvas) => void) | null = null;

  constructor() {
    this.id = DisplayComponent.ID++;

    this._layoutStyle = new LayoutStyle();

    this.s = ComponentStyle.Create()
      .setBackgroundColor(colors.BACKGROUND_OFF)
      .setColor(colors.FOREGROUND_OFF);
  }

  // ---------------------------------------------------------------------------
  // Border
  // ---------------------------------------------------------------------------

  border(): ComponentBorder {
    return this._border;
  }

  setBorder(b: ComponentBorder): this {
    this._border = b;
    this.setDirty(true);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  layout(): LayoutBounds {
    return this._layoutStyle.layout();
  }

  setLayout(layout: LayoutBounds): this {
    this._layoutStyle.setLayout(layout);
    return this;
  }

  /**
   * The inner area available to this component's content.
   *
   * Layout bounds represent the entire outer box:
   *
   *   ┌─────────────────────────┐
   *   │         border          │
   *   │  ┌───────────────────┐  │
   *   │  │      padding      │  │
   *   │  │   ┌───────────┐   │  │
   *   │  │   │  content  │   │  │
   *   │  │   └───────────┘   │  │
   *   │  └───────────────────┘  │
   *   └─────────────────────────┘
   *
   * Margin is intentionally NOT included here because margin is outside
   * the component's layout box.
   */
  contentLayout(): LayoutBounds {
    const layout = this.layout();
    const padding = this.padding();
    const border = this.border();

    return {
      x: layout.x + padding.left + border.left(),

      y: layout.y + padding.top + border.top(),

      width: Math.max(
        0,
        layout.width -
          padding.left -
          padding.right -
          border.left() -
          border.right(),
      ),

      height: Math.max(
        0,
        layout.height -
          padding.top -
          padding.bottom -
          border.top() -
          border.bottom(),
      ),
    };
  }

  /** The containing block used by absolutely positioned descendants. */
  paddingLayout(): LayoutBounds {
    const layout = this.layout();
    const border = this.border();

    return {
      x: layout.x + border.left(),
      y: layout.y + border.top(),
      width: Math.max(0, layout.width - border.left() - border.right()),
      height: Math.max(0, layout.height - border.top() - border.bottom()),
    };
  }

  // ---------------------------------------------------------------------------
  // Tree
  // ---------------------------------------------------------------------------

  parent(): DisplayComponent | null {
    return this.pr;
  }

  setParent(parent: DisplayComponent | null): this {
    this.pr = parent;
    return this;
  }

  children(): DisplayComponent[] {
    return this.childs;
  }

  addChildren(children: DisplayComponent[]): this;
  addChildren(child: DisplayComponent): this;
  addChildren(children: DisplayComponent | DisplayComponent[]): this {
    if (Array.isArray(children)) {
      for (const child of children) {
        this.childs.push(child.setParent(this));
      }
    } else {
      this.childs.push(children.setParent(this));
    }

    this.setDirty(true);

    return this;
  }

  addChildAt(child: DisplayComponent, index: number): this {
    this.childs.splice(index, 0, child.setParent(this));
    this.setDirty(true);
    return this;
  }

  removeChild(child: DisplayComponent): this {
    this.childs = this.childs.filter((current) => current !== child);

    child.setParent(null);

    this.setDirty(true);

    return this;
  }

  getId(): number {
    return this.id;
  }

  findChildrenByName(nm: string): DisplayComponent | null {
    if (this.name() === nm) {
      return this;
    }

    for (const child of this.children()) {
      const found = child.findChildrenByName(nm);

      if (found) {
        return found;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Painting
  // ---------------------------------------------------------------------------

  setPaintHook(paintHook: (canvas: Canvas) => void): this {
    this.paintHook = paintHook;
    return this;
  }

  paint(canvas: Canvas): void {
    this.paintHook?.(canvas);
  }

  setPrePaintHook(paintHook: (canvas: Canvas) => void): this {
    this.prePaintHook = paintHook;
    return this;
  }

  onPrePaint(canvas: Canvas): void {
    this.prePaintHook?.(canvas);
  }

  // ---------------------------------------------------------------------------
  // Layout Measurement
  // ---------------------------------------------------------------------------

  /**
   * Measure this component's desired size.
   *
   * Measurement does not establish x/y.
   *
   * It answers:
   *
   *   "Given these constraints, how large would I like to be?"
   */
  measure(constraints: MeasureConstraints): MeasuredSize {
    if (this._dirty == false) {
      return this._measuredSize;
    }

    const styleConstraints = LayoutDimensions.applyStyleConstraints(
      this,
      constraints,
    );

    let width = parseSize(this.width(), styleConstraints.maxWidth);

    let height = parseSize(this.height(), styleConstraints.maxHeight);

    const contentConstraints = this.contentConstraints(styleConstraints);

    const contentSize = this.measureContent(contentConstraints);

    if (width === null) {
      width =
        contentSize.width + this.horizontalPadding() + this.horizontalBorder();
    } else {
      width += this.horizontalPadding() + this.horizontalBorder();
    }

    if (height === null) {
      height =
        contentSize.height + this.verticalPadding() + this.verticalBorder();
    } else {
      height += this.verticalPadding() + this.verticalBorder();
    }

    this._measuredSize = LayoutEngine.ClampSize(
      width ?? 0,
      height ?? 0,
      styleConstraints,
    );

    return this._measuredSize;
  }

  measuredSize(): MeasuredSize {
    return this._measuredSize;
  }

  /**
   * Arrange this component into the bounds assigned by its parent.
   *
   * This is the final size/position, unlike measuredSize().
   */
  arrange(bounds: LayoutBounds): void {
    const finalBounds = LayoutDimensions.resolveArrangedBounds(this, bounds);

    this.setLayout(finalBounds);

    this.arrangeContent(this.contentLayout());

    this._dirty = false;
  }

  /**
   * Arrange children according to this component's direction.
   */
  protected arrangeContent(bounds: LayoutBounds): void {
    const children = this.children();

    const normalChildren = children.filter(
      (child) => child.positionMode() === "normal",
    );

    const absoluteChildren = children.filter(
      (child) => child.positionMode() === "absolute",
    );

    if (this.direction() === "horizontal") {
      LayoutEngine.ArrangeHorizontal(normalChildren, bounds);
    } else {
      LayoutEngine.ArrangeVertical(normalChildren, bounds);
    }

    const absoluteBounds = this.paddingLayout();

    for (const child of absoluteChildren) {
      LayoutEngine.ArrangeAbsolute(child, absoluteBounds);
    }
  }

  /**
   * Measure children according to this component's direction.
   */
  protected measureContent(constraints: MeasureConstraints): MeasuredSize {
    const children = this.children();

    if (children.length === 0) {
      return {
        width: 0,
        height: 0,
      };
    }

    const flowChildren = children.filter(
      (child) => child.positionMode() === "normal",
    );

    if (flowChildren.length === 0) {
      return {
        width: 0,
        height: 0,
      };
    }

    if (this.direction() === "horizontal") {
      return LayoutDimensions.measureHorizontal(flowChildren, constraints);
    }

    return LayoutDimensions.measureVertical(flowChildren, constraints);
  }

  // ---------------------------------------------------------------------------
  // Measurement helpers
  // ---------------------------------------------------------------------------

  private constrainedLayout: MeasureConstraints = {
    maxHeight: 0,
    maxWidth: 0,
    minHeight: 0,
    minWidth: 0,
  };

  protected contentConstraints(
    constraints: MeasureConstraints,
  ): MeasureConstraints {
    const padding = this.padding();
    const border = this.border();

    const horizontal =
      padding.left + padding.right + border.left() + border.right();

    const vertical =
      padding.top + padding.bottom + border.top() + border.bottom();

    this.constrainedLayout.minWidth = Math.max(
      0,
      constraints.minWidth - horizontal,
    );

    this.constrainedLayout.maxWidth = Math.max(
      0,
      constraints.maxWidth - horizontal,
    );

    this.constrainedLayout.minHeight = Math.max(
      0,
      constraints.minHeight - vertical,
    );

    this.constrainedLayout.maxHeight = Math.max(
      0,
      constraints.maxHeight - vertical,
    );

    return this.constrainedLayout;
  }

  // ---------------------------------------------------------------------------
  // Box helpers
  // ---------------------------------------------------------------------------

  private horizontalBorder(): number {
    const border = this.border();

    return border.left() + border.right();
  }

  private verticalBorder(): number {
    const border = this.border();

    return border.top() + border.bottom();
  }

  private horizontalPadding(): number {
    const padding = this.padding();

    return padding.left + padding.right;
  }

  private verticalPadding(): number {
    const padding = this.padding();

    return padding.top + padding.bottom;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  onEvent(event: EditorEvents): void {
    for (const child of this.children()) {
      child.onEvent(event);
    }
  }

  // ---------------------------------------------------------------------------
  // Ordering
  // ---------------------------------------------------------------------------

  index(): number {
    return this.ind;
  }

  setIndex(nval: number): this {
    const parent = this.parent();

    if (parent) {
      assert(nval >= parent.index(), "index cannot be less than parent");
    }

    for (const child of this.children()) {
      if (nval >= child.index()) {
        child.setIndex(nval + 1);
      }
    }

    this.ind = nval;

    return this;
  }

  // ---------------------------------------------------------------------------
  // Visibility
  // ---------------------------------------------------------------------------

  setVisible(value: boolean): this {
    this.vs = value;
    return this;
  }

  visible(): boolean {
    return this.vs;
  }

  // ---------------------------------------------------------------------------
  // Focus
  // ---------------------------------------------------------------------------

  focusable(): boolean {
    return this._focusable;
  }

  setFocusable(value: boolean): this {
    this._focusable = value;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------

  text(): string | undefined {
    return this._text;
  }

  setText(value: string): this {
    this._text = value;
    this.setDirty(true);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Name
  // ---------------------------------------------------------------------------

  name(): string | null | undefined {
    return this.nm;
  }

  setName(newName: string): this {
    this.nm = newName;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Layout Style
  // ---------------------------------------------------------------------------

  layoutStyle(): LayoutStyle {
    return this._layoutStyle;
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
  display() {
    return this.layoutStyle().display();
  }
  setDisplay(dp: DisplayTypes) {
    this.layoutStyle().setDisplay(dp);
    return this;
  }
}

export function parseSize(size: Size, available: number): number | null {
  if (size === "auto") {
    return null;
  }

  if (typeof size === "number") {
    return size;
  }

  const percentage = Number.parseFloat(size);

  return (available * percentage) / 100;
}
