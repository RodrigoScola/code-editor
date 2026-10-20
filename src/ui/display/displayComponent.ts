import { assert } from "../../assert.js";
import { TextBuffer } from "../buffer/Buffer.js";

import { ICanvas } from "../Canvas/TerminalCanvas.js";
import { DisplayLike, LayoutEngine } from "../layout/layout.js";
import { LayoutDimensions } from "../layout/LayoutDimensions.js";
import { OverflowTypes, TextAlign, TextLayout } from "../TextLayout/text.js";
import { ViewPort } from "../windows/viewport.js";
import { BorderStyles, ComponentBorder } from "./border.js";
import { ComponentLayoutFns } from "../layout/componentLayout.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
import { ScrollBar, ScrollBarStyle } from "../components/Scrollbar.js";
import { ComponentScroll } from "./ComponentScroll.js";
import { ComponentLayout } from "./ComponentLayout.js";
import { ComponentChildren } from "./ComponentChildren.js";
import { ComponentStyle } from "../ComponentStyles.js";

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

  private _scroll = new ComponentScroll(this);
  private _layout = new ComponentLayout(this);
  private _children = new ComponentChildren(this);

  private _text: TextLayout = new TextLayout(this);

  // what the last measure and arrange were given: a clean view reuses its
  // results only for the same input, so a new screen size or a parent that
  // moves it still lays it out again
  private _arrangedTo: LayoutBounds | null = null;

  private _viewport: ViewPort = new ViewPort();

  private _border: ComponentBorder = new ComponentBorder();

  private paintHook: ((canvas: ICanvas) => void) | null = null;
  private postPaintHook: ((canvas: ICanvas) => void) | null = null;
  private prePaintHook: ((canvas: ICanvas) => void) | null = null;

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

  contentLayout(): LayoutBounds {
    return this._layout.content();
  }

  /** The containing block used by absolutely positioned descendants. */
  paddingLayout(): LayoutBounds {
    return this._layout.paddingLayout();
  }

  scrollIntoView(component: DisplayComponent) {
    return this._scroll.scrollIntoView(component);
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
    return this._layout.clip();
  }

  // ---------------------------------------------------------------------------
  // Tree
  // ---------------------------------------------------------------------------

  children(): DisplayComponent[] {
    return this._children.children();
  }

  addChildren(children: DisplayComponent[]): this;
  addChildren(child: DisplayComponent): this;
  addChildren(children: DisplayComponent | DisplayComponent[]): this {
    this._children.addChildren(children);

    this.setDirty(true);
    return this;
  }

  addChildAt(child: DisplayComponent, index: number): this {
    this._children.addChildAt(child, index);
    this.setDirty(true);
    return this;
  }

  removeChild(child: DisplayComponent): this {
    this._children.removeChild(child);

    this.setDirty(true);

    return this;
  }

  findChildrenById(id: number): DisplayComponent | null {
    return this._children.findChildrenById(id);
  }

  findChildrenByName(nm: string): DisplayComponent | null {
    return this._children.findChildrenByName(nm);
  }

  getId(): number {
    return this.id;
  }

  verticalScrollbar(): ScrollBar | null {
    return this._scroll.verticalScrollbar();
  }

  horizontalScrollbar(): ScrollBar | null {
    return this._scroll.horizontalScrollbar();
  }

  scrollTop() {
    return this._scroll.scrollTop();
  }

  setScrollTop(amount: number) {
    // the children move, so the next frame has to arrange them again
    this.setDirty(true);
    this._scroll.setScrollTop(amount);
    return this;
  }

  scrollLeft() {
    return this._scroll.scrollLeft();
  }

  scrollWidth() {
    return this._scroll.scrollWidth();
  }

  scrollHeight() {
    return this._scroll.scrollHeight();
  }
  setScrollLeft(amount: number) {
    this.setDirty(true);
    this._scroll.setScrollLeft(amount);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  setScrollBar(enabled: boolean) {
    this._scroll.setScrollBar(enabled);
    this.setDirty(true);
    return this;
  }

  setScrollbarStyle(style: Partial<ScrollBarStyle>) {
    this._scroll.setScrollbarStyle(style);
    this.setDirty(true);
    return this;
  }
  // ---------------------------------------------------------------------------
  // Painting
  // ---------------------------------------------------------------------------

  setPaintHook(paintHook: (canvas: ICanvas) => void): this {
    this.paintHook = paintHook;
    return this;
  }

  paint(canvas: ICanvas): void {
    this.paintHook?.(canvas);
  }

  setPostPaintHook(paintHook: (canvas: ICanvas) => void): this {
    this.postPaintHook = paintHook;
    return this;
  }
  postPaint(canvas: ICanvas) {
    this.postPaintHook?.(canvas);
  }

  setPrePaintHook(paintHook: (canvas: ICanvas) => void): this {
    this.prePaintHook = paintHook;
    return this;
  }

  onPrePaint(canvas: ICanvas): void {
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
    return this._layout.measure(constraints);
  }

  measuredSize(): MeasuredSize {
    return this._layout.measuredSize();
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

    this._scroll.arrange();

    this.content().measure(bounds);

    this.setDirty(false);
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

  // ---------------------------------------------------------------------------
  // Measurement helpers
  // ---------------------------------------------------------------------------

  protected contentConstraints(
    constraints: MeasureConstraints,
  ): MeasureConstraints {
    return this._layout.constraints(constraints);
  }

  // ---------------------------------------------------------------------------
  // Box helpers
  // ---------------------------------------------------------------------------

  horizontalBorder(): number {
    const border = this.border();

    return border.left() + border.right();
  }

  verticalBorder(): number {
    const border = this.border();

    return border.top() + border.bottom();
  }

  horizontalPadding(): number {
    const padding = this.padding();

    return padding.left + padding.right;
  }

  verticalPadding(): number {
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
  // how tall a line of text is: a cell on the terminal (font size 1), the
  // font size in pixels in a window
  lineHeight() {
    return this.styles().fontSize();
  }
  // how wide a character is: a cell on the terminal; in a window the font's
  // real width (not rounded, or columns drift away from the text)
  charWidth() {
    const fontSize = this.styles().fontSize();
    return fontSize === 1 ? 1 : fontSize * ComponentStyle.CharAdvance;
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

  visibleHeight() {
    let out = this.paddingLayout().height;

    const horizontalScroll = this._scroll.cache().horizontal;
    if (horizontalScroll) {
      out -= horizontalScroll.height();
    }

    return out;
  }

  visibleWidth() {
    let out = this.paddingLayout().width;
    const verticalScroll = this._scroll.cache().vertical;

    if (verticalScroll) {
      out -= verticalScroll.width();
    }

    return out;
  }

  private clearCache() {
    this._scroll.reset();
    this._layout.forgetMeasured();
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
