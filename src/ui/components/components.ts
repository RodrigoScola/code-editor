import { assert } from "../../assert.js";
import { TextBuffer } from "../buffer/Buffer.js";

import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { LayoutEngine } from "../layout/layout.js";
import { LayoutDimensions } from "../layout/LayoutDimensions.js";
import { LayoutBounds } from "../layout/layoutStyle.js";
import { OverflowTypes, TextLayout } from "../TextLayout/text.js";
import { ViewPort } from "../windows/viewport.js";
import { ComponentBorder } from "./border.js";
import { ComponentLayoutFns } from "./componentLayout.js";

export class DisplayComponent extends ComponentLayoutFns {
  private static ID = 0;

  private readonly id: number;

  private ind = 0;
  private vs = true;

  private nm: string | null | undefined;

  private _focused = false;
  private _text: TextLayout = new TextLayout();

  private _measuredSize: MeasuredSize = {
    height: 0,
    width: 0,
  };

  private _viewport: ViewPort = new ViewPort();

  private childs: DisplayComponent[] = [];

  private s: ComponentStyle;

  private _border: ComponentBorder = new ComponentBorder();

  private paintHook: ((canvas: Canvas) => void) | null = null;
  private prePaintHook: ((canvas: Canvas) => void) | null = null;

  constructor() {
    super();
    this.id = DisplayComponent.ID++;

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
    if (this.dirty() == false) {
      return this._measuredSize;
    }

    let styleConstraints = LayoutDimensions.applyStyleConstraints(
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

    this.content().measure(bounds);

    this.setDirty(false);
  }

  normalChildren() {
    return this.children().filter((child) => child.positionMode() === "normal");
  }
  absoluteChildren() {
    return this.children().filter(
      (child) => child.positionMode() === "absolute",
    );
  }

  /**
   * Arrange children according to this component's direction.
   */
  protected arrangeContent(bounds: LayoutBounds): void {
    const absoluteChildren = this.absoluteChildren();

    if (this.direction() === "horizontal") {
      LayoutEngine.ArrangeHorizontal(this, bounds);
    } else {
      LayoutEngine.ArrangeVertical(this, bounds);
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
    const text = this.text();
    const textSize =
      text === undefined
        ? { width: 0, height: 0 }
        : {
            width: Math.max(...text.split("\n").map((line) => line.length)),
            height: text.split("\n").length,
          };

    if (children.length === 0) {
      return textSize;
    }

    const flowChildren = children.filter(
      (child) => child.positionMode() === "normal",
    );

    if (flowChildren.length === 0) {
      return textSize;
    }

    const childSize =
      this.direction() === "horizontal"
        ? LayoutDimensions.measureHorizontal(flowChildren, constraints)
        : LayoutDimensions.measureVertical(flowChildren, constraints);

    if (this.direction() === "horizontal") {
      return {
        width: Math.max(childSize.width, textSize.width),
        height: Math.max(childSize.height, textSize.height),
      };
    }

    return {
      width: Math.max(childSize.width, textSize.width),
      height: Math.max(childSize.height, textSize.height),
    };
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

  focused(): boolean {
    return this._focused;
  }

  setFocused(value: boolean): this {
    this._focused = value;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------
  content() {
    return this._text;
  }
  setText(t: TextLayout) {
    this._text = t;
    return this;
  }
  lineWidth() {
    return this.content().lineWidth();
  }
  setLineWidth(n: number | undefined) {
    this.content().setLineWidth(n);
    return this;
  }

  text(): string | undefined {
    // todo: change this out
    return this._text.buffer().content();
  }

  setContent(value: string): this {
    this._text.setBuffer(new TextBuffer(value));
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
  viewport() {
    return this._viewport;
  }
  textOverflow() {
    return this.content().overflow();
  }
  setTextOverflow(type: OverflowTypes) {
    this.content().setOverflow(type);
  }
  hasChildren() {
    return this.children().length > 0;
  }
  hasContent() {
    return this.content().lines().length > 0;
  }

  // ---------------------------------------------------------------------------
  // Layout Style
  // ---------------------------------------------------------------------------
}

export function parseSize(size: Size, available: number): number | null {
  if (size === "auto" || size === "fit-content") {
    return null;
  }

  if (typeof size === "number") {
    return size;
  }

  const percentage = Number.parseFloat(size);

  return (available * percentage) / 100;
}
