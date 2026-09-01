import { assert } from "../assert.js";
import { Canvas } from "./canvas.js";
import colors from "./colors.js";
import { ComponentStyle } from "./ComponentStyles.js";
import { LayoutStyle } from "./layout/layoutStyle.js";
import { ViewPort } from "./windows/viewport.js";

export class DisplayComponent {
  private static ID = 0;

  private readonly id: number;
  private readonly _layoutStyle: LayoutStyle;

  private ind = 0;
  private vs = true;

  private nm: string | null | undefined;
  private vp: ViewPort = new ViewPort();

  private _focusable = false;
  private _text: string | undefined;

  private childs: DisplayComponent[] = [];
  private pr: DisplayComponent | null = null;

  private l: LayoutBounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  private s: ComponentStyles;

  private paintHook: ((canvas: Canvas) => void) | null = null;
  private prePaintHook: ((canvas: Canvas) => void) | null = null;

  constructor() {
    this.id = DisplayComponent.ID++;
    this._layoutStyle = new LayoutStyle();

    this.s = ComponentStyle.Create()
      .setBackgroundColor(colors.BACKGROUND_OFF)
      .setColor(colors.FOREGROUND_OFF);
  }

  name(): string | null | undefined {
    return this.nm;
  }

  setName(newName: string): this {
    this.nm = newName;
    return this;
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
  // Layout
  // ---------------------------------------------------------------------------

  layout(): LayoutBounds {
    return this.l;
  }

  setLayout(layout: LayoutBounds): this {
    this.l = layout;
    return this;
  }

  contentLayout(): LayoutBounds {
    const layout = this.layout();
    const padding = this.padding();

    return {
      height: Math.max(0, layout.height - padding.top - padding.bottom),
      width: Math.max(0, layout.width - padding.left - padding.right),
      x: layout.x + padding.left,
      y: layout.y + padding.top,
    };
  }

  // ---------------------------------------------------------------------------
  // Tree
  // ---------------------------------------------------------------------------

  parent(): DisplayComponent | null {
    return this.pr;
  }

  setParent(parent: DisplayComponent): this {
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

    return this;
  }

  addChildAt(child: DisplayComponent, index: number): this {
    this.childs.splice(index, 0, child.setParent(this));
    return this;
  }

  removeChild(child: DisplayComponent): this {
    this.childs = this.childs.filter((current) => current !== child);

    return this;
  }

  getId(): number {
    return this.id;
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

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

  measure(bounds: LayoutBounds): Partial<LayoutBounds> {
    return {};
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
  // Viewport
  // ---------------------------------------------------------------------------

  viewport(): ViewPort {
    return this.vp;
  }

  setViewport(viewport: ViewPort): this {
    this.vp = viewport;
    return this;
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
    return this;
  }

  height(): Size {
    return this.layoutStyle().height();
  }

  setHeight(height: Size): this {
    this.layoutStyle().setHeight(height);
    return this;
  }

  maxWidth(): number | null {
    return this.layoutStyle().maxWidth();
  }

  setMaxWidth(maxWidth: number | null): this {
    this.layoutStyle().setMaxWidth(maxWidth);
    return this;
  }

  maxHeight(): number | null {
    return this.layoutStyle().maxHeight();
  }

  setMaxHeight(maxHeight: number | null): this {
    this.layoutStyle().setMaxHeight(maxHeight);
    return this;
  }

  margin(): Insets {
    return this.layoutStyle().margin();
  }

  setMargin(margin: Insets): this {
    this.layoutStyle().setMargin(margin);
    return this;
  }

  padding(): Insets {
    return this.layoutStyle().padding();
  }

  setPadding(padding: Insets): this {
    this.layoutStyle().setPadding(padding);
    return this;
  }

  positionMode(): PositionMode {
    return this.layoutStyle().position();
  }

  setPositionMode(position: PositionMode): this {
    this.layoutStyle().setPosition(position);
    return this;
  }

  direction(): DisplayDirection {
    return this.layoutStyle().direction();
  }

  setDirection(direction: DisplayDirection): this {
    this.layoutStyle().setDirection(direction);
    return this;
  }
}
