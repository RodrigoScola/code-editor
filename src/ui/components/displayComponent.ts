import { assert } from "../../assert.js";
import { TextBuffer } from "../buffer/Buffer.js";

import { Canvas } from "../canvas.js";
import colors from "../colors.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { DisplayLike, LayoutEngine } from "../layout/layout.js";
import { LayoutDimensions } from "../layout/LayoutDimensions.js";
import { OverflowTypes, TextAlign, TextLayout } from "../TextLayout/text.js";
import { ViewPort } from "../windows/viewport.js";
import { BorderStyles, ComponentBorder } from "../display/border.js";
import { ComponentLayoutFns } from "../layout/componentLayout.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
import { ScrollBar, ScrollBarStyle } from "./Scrollbar.js";

export class DisplayComponent
  extends ComponentLayoutFns
  implements DisplayLike
{
  private static ID = 0;

  private readonly id: number;

  private ind = 0;
  private vs = true;

  private nm: string | null | undefined;
  private _enabled: boolean = true;

  private _text: TextLayout = new TextLayout(this);

  private _measuredSize: MeasuredSize = {
    height: 0,
    width: 0,
  };

  // what the last measure and arrange were given: a clean view reuses its
  // results only for the same input, so a new screen size or a parent that
  // moves it still lays it out again
  private _measuredWith: MeasureConstraints = {
    maxHeight: -1,
    maxWidth: -1,
    minHeight: -1,
    minWidth: -1,
  };
  private _arrangedTo: LayoutBounds | null = null;

  private _viewport: ViewPort = new ViewPort();

  private childs: DisplayComponent[] = [];

  private _border: ComponentBorder = new ComponentBorder();

  private paintHook: ((canvas: Canvas) => void) | null = null;
  private postPaintHook: ((canvas: Canvas) => void) | null = null;
  private prePaintHook: ((canvas: Canvas) => void) | null = null;

  constructor() {
    super();
    this.id = DisplayComponent.ID++;
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

  // Inline border shortcuts — size changes mark the component dirty.

  setBorderSize(n: number): this {
    this._border.setParameter(n);
    this.setDirty(true);
    return this;
  }
  setBorderLeft(n: number): this {
    this._border.setLeft(n);
    this.setDirty(true);
    return this;
  }
  setBorderRight(n: number): this {
    this._border.setRight(n);
    this.setDirty(true);
    return this;
  }
  setBorderTop(n: number): this {
    this._border.setTop(n);
    this.setDirty(true);
    return this;
  }
  setBorderBottom(n: number): this {
    this._border.setBottom(n);
    this.setDirty(true);
    return this;
  }
  setBorderStyle(st: BorderStyles): this {
    this._border.setBorderSyle(st);
    return this;
  }
  setBorderColor(newColor: string): this {
    this._border.setColor(newColor);
    return this;
  }
  setBorderBackgroundColor(newColor: string): this {
    this._border.setBackgroundColor(newColor);
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
  private _layoutBounds = new LayoutBounds();
  contentLayout(): LayoutBounds {
    const layout = this.layout();
    const padding = this.padding();
    const border = this.border();

    const bar = this.verticalScrollbar();
    const verticalBar = bar ? bar.width() : 0;
    const hbar = this.horizontalScrollbar();
    const horizontalBar = hbar ? hbar.height() : 0;

    return this._layoutBounds
      .setX(layout.x + padding.left + border.left())
      .setY(layout.y + padding.top + border.top())
      .setWidth(
        Math.max(
          0,
          layout.width -
            padding.left -
            padding.right -
            border.left() -
            border.right() -
            verticalBar,
        ),
      )
      .setHeight(
        Math.max(
          0,
          layout.height -
            padding.top -
            padding.bottom -
            border.top() -
            border.bottom() -
            horizontalBar,
        ),
      );
  }

  /** The containing block used by absolutely positioned descendants. */
  private _paddingLayoutBounds = new LayoutBounds();
  paddingLayout(): LayoutBounds {
    const layout = this.layout();
    const border = this.border();

    this._paddingLayoutBounds
      .setX(layout.x + border.left())
      .setY(layout.y + border.top())
      .setWidth(Math.max(0, layout.width - border.left() - border.right()))
      .setHeight(Math.max(0, layout.height - border.top() - border.bottom()));

    return this._paddingLayoutBounds;
  }

  /**
   * Where this component may paint, or null when nothing limits it.
   *
   * Every ancestor whose overflow isn't "visible" keeps its content inside
   * its padding box, so this is all of those boxes intersected. The
   * component's own overflow doesn't count: it clips its children, not its
   * own background and border. A width or height of 0 means nothing shows.
   */
  clipBounds(): LayoutBounds | null {
    let clip: LayoutBounds | null = null;

    for (let parent = this.parent(); parent; parent = parent.parent()) {
      if (parent.overflow() === "visible") {
        continue;
      }

      const layout = parent.paddingLayout().clone();
      const hbar = parent.horizontalScrollbar();
      if (hbar) {
        layout.setHeight(layout.height - hbar.height());
      }
      const vbar = parent.verticalScrollbar();
      if (vbar) {
        layout.setWidth(layout.width - vbar.height());
      }

      clip = intersectBounds(clip, layout);
    }

    return clip;
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
  findChildrenById(id: number): DisplayComponent | null {
    if (this.id === id) {
      return this;
    }
    for (const child of this.children()) {
      const found = child.findChildrenById(id);
      if (found) {
        return found;
      }
    }
    return null;
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

  setScrollBar(enabled: boolean) {
    this._scrollBarEnabled = enabled;
    this.clearCache();
    this.setDirty(true);
    return this;
  }

  setScrollbarStyle(style: Partial<ScrollBarStyle>) {
    this._verticalScrollBar.setStyle(style);

    this._horizontalScrollBar.setStyle(style);
    this.setDirty(true);
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

  setPostPaintHook(paintHook: (canvas: Canvas) => void): this {
    this.postPaintHook = paintHook;
    return this;
  }
  postPaint(canvas: Canvas) {
    this.postPaintHook?.(canvas);
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
    if (
      !this.dirty() &&
      LayoutEngine.SameConstraints(this._measuredWith, constraints)
    ) {
      return this._measuredSize;
    }
    this._measuredWith.maxHeight = constraints.maxHeight;
    this._measuredWith.maxWidth = constraints.maxWidth;
    this._measuredWith.minWidth = constraints.minWidth;
    this._measuredWith.minHeight = constraints.minHeight;

    let styleConstraints = LayoutDimensions.applyStyleConstraints(
      this,
      constraints,
    );

    const contentConstraints = this.contentConstraints(styleConstraints);

    const contentSize = this.measureContent(contentConstraints);

    // auto sizes fit the content, but stay inside the space given
    const fitted = LayoutEngine.ClampSize(
      contentSize.width + this.horizontalPadding() + this.horizontalBorder(),
      contentSize.height + this.verticalPadding() + this.verticalBorder(),
      styleConstraints,
    );

    // an explicit size is not shrunk to the space given: it overflows the
    // parent, like CSS. Only its own maxWidth/maxHeight limit it, the same
    // rule arrange uses, so measuredSize() matches the final layout
    const width =
      parseSize(this.width(), styleConstraints.maxWidth) === null
        ? fitted.width
        : Math.max(
            styleConstraints.minWidth,
            LayoutDimensions.requestedOuterWidth(
              this,
              styleConstraints.maxWidth,
            )!,
          );

    const height =
      parseSize(this.height(), styleConstraints.maxHeight) === null
        ? fitted.height
        : Math.max(
            styleConstraints.minHeight,
            LayoutDimensions.requestedOuterHeight(
              this,
              styleConstraints.maxHeight,
            )!,
          );

    this._measuredSize.width = width;
    this._measuredSize.height = height;

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

    // nothing changed inside it and it stays where it was: its children and
    // its wrapped text are still right. Re-wrapping the text is the costly
    // part for a long document
    if (
      !this.dirty() &&
      LayoutEngine.SameBounds(this._arrangedTo, finalBounds)
    ) {
      return;
    }
    this.clearCache();

    this._arrangedTo = finalBounds.clone();

    this.setLayout(finalBounds);

    this.arrangeContent(this.contentLayout());

    this.arrangeScrollbar();

    this.content().measure(bounds);

    this.setDirty(false);
  }

  private arrangeScrollbar() {
    let paddingHeight = this.paddingLayout().height;
    let paddingWidth = this.paddingLayout().width;

    if (this.horizontalScrollbar()) {
      paddingHeight -= this.horizontalScrollbar()!.height();
    }
    if (this.verticalScrollbar()) {
      paddingWidth -= this.verticalScrollbar()!.width();
    }

    const verticalDimensions = ScrollBar.Thumb(
      paddingHeight,
      this.visibleHeight(),
      this.scrollHeight(),
      this.scrollTop(),
    );

    this.verticalScrollbar()
      ?.setSize(verticalDimensions.size)
      .setOffset(verticalDimensions.offset);

    const horizontalDimensions = ScrollBar.Thumb(
      paddingWidth,
      this.visibleWidth(),
      this.scrollWidth(),
      this.scrollLeft(),
    );
    this.horizontalScrollbar()
      ?.setSize(horizontalDimensions.size)
      .setOffset(horizontalDimensions.offset);
  }

  normalChildren() {
    // hidden children take no space; siblings share it as if they weren't there
    return this.children().filter(
      (child) => child.positionMode() === "normal" && child.visible(),
    );
  }
  absoluteChildren() {
    return this.children().filter(
      (child) => child.positionMode() === "absolute",
    );
  }

  /**
   * Arrange children according to this component's direction.
   *
   * arrange() already skips a component that is clean and didn't move, so
   * this always runs: a component that moved has to move its children too.
   */
  protected arrangeContent(bounds: LayoutBounds): void {
    const absoluteChildren = this.absoluteChildren();

    if (this.overflow() !== "hidden") {
      bounds
        .setX(bounds.x - this.scrollLeft())
        .setY(bounds.y - this.scrollTop());
    }

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

    // hidden children take no space, so they add nothing to the size either
    const flowChildren = children.filter(
      (child) => child.positionMode() === "normal" && child.visible(),
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

  enabled() {
    return this._enabled;
  }
  setEnabled(enabled: boolean) {
    this._enabled = enabled;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Visibility
  // ---------------------------------------------------------------------------

  setVisible(value: boolean): this {
    // hidden children take no space, so the parent has to lay out again
    if (this.vs !== value) {
      this.setDirty(true);
    }
    this.vs = value;
    return this;
  }

  // display "none" hides it like setVisible(false): no space, no paint
  visible(): boolean {
    return this.vs && this.display() !== "none";
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------
  content() {
    return this._text;
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
    return this;
  }
  textAlign() {
    return this.content().align();
  }
  setTextAlign(align: TextAlign) {
    this.content().setAlign(align);
    return this;
  }
  textJustify() {
    return this.content().justify();
  }
  setTextJustify(val: boolean) {
    this.content().setJustify(val);
    return this;
  }
  hasChildren() {
    return this.children().length > 0;
  }
  hasContent() {
    return this.content().lines().length > 0;
  }

  private logSelf() {
    let str = `id: ${this.id}`;

    if (this.name()) {
      str += " - ";
      str += `name: ${this.name()}`;
      str += " - ";
    }

    const txt = this.text();
    if (txt) {
      const max = Math.min(10, txt.length);
      str += ` content: ${this.text()?.slice(0, max)}`;
      str += " - ";
    }

    return str;
  }

  /*
   * This component and its descendants as text, e.g.
   *
   *   id: 0 - name: root_window
   *   ├── id: 3
   *   │   ├── id: 4 - name: tree_window
   *   │   └── id: 7
   *   └── id: 9
   */
  logChildren(): string {
    return this.treeLines().join("\n");
  }

  private treeLines(): string[] {
    const lines = [this.logSelf()];
    const children = this.children();

    children.forEach((child, i) => {
      const last = i === children.length - 1;
      const [first, ...rest] = child.treeLines();

      lines.push((last ? "└── " : "├── ") + first);
      // keep the parent's vertical line going past non-last children
      for (const line of rest) {
        lines.push((last ? "    " : "│   ") + line);
      }
    });

    return lines;
  }
  view(): DisplayComponent {
    return this;
  }
  private _scrollTop: number = 0;
  private _scrollLeft: number = 0;
  scrollTop() {
    const max = Math.max(0, this.scrollHeight() - this.visibleHeight());
    return Math.min(Math.max(this._scrollTop, 0), max);
  }
  setScrollTop(amount: number) {
    // the children move, so the next frame has to arrange them again
    if (this._scrollTop !== amount) {
      this.setDirty(true);
    }
    this._scrollTop = amount;

    return this;
  }
  scrollLeft() {
    const max = Math.max(0, this.scrollWidth() - this.visibleWidth());
    return Math.min(Math.max(this._scrollLeft, 0), max);
  }

  setScrollLeft(amount: number) {
    if (this._scrollLeft !== amount) {
      this.setDirty(true);
    }
    this._scrollLeft = amount;
    return this;
  }
  scrollWidth() {
    let width = this.padding().left + this.padding().right;
    let childrenWidth = 0;
    let maxWidth = 0;

    for (const child of this.normalChildren()) {
      const childWidth =
        child.measuredSize().width + child.margin().left + child.margin().right;

      maxWidth = Math.max(childWidth, maxWidth);
      childrenWidth += childWidth;
    }

    if (this.direction() === "vertical") {
      width += maxWidth;
    } else {
      width += childrenWidth;
    }

    return width;
  }
  scrollHeight() {
    let height = this.padding().top + this.padding().bottom;
    let childrenHeight = 0;
    let maxHeight = 0;

    // measured sizes, not layouts: arrange asks for this before it has
    // placed the children
    for (const child of this.normalChildren()) {
      const childHeight =
        child.measuredSize().height +
        child.margin().top +
        child.margin().bottom;

      maxHeight = Math.max(maxHeight, childHeight);
      childrenHeight += childHeight;
    }

    if (this.direction() === "vertical") {
      height += childrenHeight;
    } else {
      height += maxHeight;
    }

    return height;
  }

  visibleHeight() {
    let out = this.paddingLayout().height;

    if (this._cachedBars.horizontal) {
      out -= this._cachedBars.horizontal.height();
    }

    return out;
  }

  visibleWidth() {
    let out = this.paddingLayout().width;
    if (this._cachedBars.vertical) {
      out -= this._cachedBars.vertical!.width();
    }

    return out;
  }

  scrollIntoView(component: DisplayComponent) {
    const child = this.findChildrenById(component.getId());
    if (!child) {
      console.error(`children not found `);
      return null;
    }

    const childTop =
      child.layout().y - this.contentLayout().y + this.scrollTop();

    const childBottom = child.layout().height + childTop;

    const windowTop = this.scrollTop();
    const windowBottom = windowTop + this.visibleHeight();

    if (childTop < windowTop) {
      this.setScrollTop(childTop);
    } else if (childBottom > windowBottom) {
      this.setScrollTop(childBottom - windowBottom);
    }
  }

  private _verticalScrollBar = new ScrollBar();
  private _horizontalScrollBar = new ScrollBar();
  private _scrollBarEnabled: boolean = true;

  private _cachedBars = {
    vertical: null,
    horizontal: null,
  } as { vertical: ScrollBar | null; horizontal: ScrollBar | null };

  verticalScrollbar(): ScrollBar | null {
    if (this._cachedBars.vertical) {
      return this._cachedBars.vertical;
    }

    if (
      !this._scrollBarEnabled ||
      this.overflow() == "visible" ||
      this.overflow() === "hidden"
    ) {
      return null;
    }

    const totalHeight = this.scrollHeight();

    if (totalHeight > this.visibleHeight()) {
      this._cachedBars.vertical = this._verticalScrollBar;
      return this._cachedBars.vertical;
    }

    this._cachedBars.vertical = null;
    return this._cachedBars.vertical;
  }
  horizontalScrollbar(): ScrollBar | null {
    if (this._cachedBars.horizontal) {
      return this._cachedBars.horizontal;
    }
    this._cachedBars.horizontal = null;

    if (this.overflow() == "visible" || this.overflow() === "hidden") {
      return this._cachedBars.horizontal;
    }

    const totalWidth = this.scrollWidth();

    if (totalWidth > this.visibleWidth()) {
      this._cachedBars.horizontal = this._horizontalScrollBar;
    }
    return this._cachedBars.horizontal;
  }
  private clearCache() {
    this._cachedBars.horizontal = null;
    this._cachedBars.vertical = null;
    this._measuredWith.maxHeight = -1;
    this._measuredWith.maxWidth = -1;
    this._measuredWith.minHeight = -1;
    this._measuredWith.minWidth = -1;
  }

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

// the part both cover; null stands for "no limit", so it gives back the other
function intersectBounds(
  a: LayoutBounds | null,
  b: LayoutBounds,
): LayoutBounds {
  if (a === null) {
    return b;
  }

  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  return LayoutBounds.Create()
    .setX(x)
    .setY(y)
    .setWidth(Math.max(0, right - x))
    .setHeight(Math.max(0, bottom - y));
}
