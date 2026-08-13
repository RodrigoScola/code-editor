import { assert } from "../assert.js";
import { Canvas } from "./canvas.js";
import colors from "./colors.js";
import { ComponentStyle } from "./ComponentStyles.js";

export class DisplayComponent implements Component {
  private static ID = 0;
  private id: number;
  private maxH: number | null = null;
  private maxW: number | null = null;
  private ind: number = 0;
  private pm: PositionMode = "normal";
  private vs: boolean = true;
  private s: ComponentStyles;
  private nm: string | null | undefined;

  private childs: Component[];

  private m: Insets = { bottom: 0, top: 0, left: 0, right: 0 };
  private p: Insets = { bottom: 0, top: 0, left: 0, right: 0 };
  private pr: Component | null;
  private l: LayoutBounds;

  private d: "vertical" | "horizontal";
  private paintHook: ((canvas: Canvas) => void) | null = null;
  private prePaintHook: ((canvas: Canvas) => void) | null = null;

  constructor() {
    this.id = DisplayComponent.ID;
    DisplayComponent.ID++;
    this.l = { x: 0, y: 0, width: 0, height: 0 };

    this.childs = [];
    this.d = "vertical";
    this.s = ComponentStyle.Create()
      .setBackgroundColor(colors.BACKGROUND_OFF)
      .setColor(colors.FOREGROUND_OFF);

    this.pr = null;
  }
  name(): string | null | undefined {
    return this.nm;
  }
  findChildrenByName(nm: string): Component | null {
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
  setName(newName: string): Component {
    this.nm = newName;
    return this;
  }
  padding(): Insets {
    return this.p;
  }
  setPadding(nPadding: Insets): Component {
    this.p = nPadding;
    return this;
  }
  contentLayout(): LayoutBounds {
    const layout = this.layout();
    return {
      height: layout.height - this.p.top - this.p.bottom,
      width: layout.width - this.p.left - this.p.right,
      x: layout.x + this.p.left,
      y: layout.y + this.p.top,
    };
  }
  direction(): "horizontal" | "vertical" {
    return this.d;
  }
  setLayout(nLayout: LayoutBounds): Component {
    this.l = nLayout;
    return this;
  }
  layout() {
    return this.l;
  }

  parent(): Component | null {
    return this.pr;
  }

  getId() {
    return this.id;
  }
  styles(): ComponentStyles | null {
    return this.s;
  }
  setMaxH(nmh: number): Component {
    this.maxH = nmh;
    return this;
  }
  maxHeight(): number | null {
    return this.maxH;
  }

  addChildren(c: Component[]): Component;
  addChildren(c: Component): Component;
  addChildren(c: Component | Component[]): Component {
    if (Array.isArray(c)) {
      for (const child of c) {
        this.childs.push(child.setParent(this));
      }
    } else {
      this.childs.push(c.setParent(this));
    }

    return this;
  }
  setParent(c: Component): Component {
    this.pr = c;

    return this;
  }

  children(): Component[] {
    return this.childs;
  }

  setDirection(direction: "vertical" | "horizontal"): Component {
    this.d = direction;

    return this;
  }
  maxWidth(): number | null {
    return this.maxW;
  }
  setMaxW(nMax: number): Component {
    this.maxW = nMax;
    return this;
  }
  setStyles(sty: Partial<ComponentStyles>): Component {
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

  setPaintHook(paintHook: (canvas: Canvas) => void): Component {
    this.paintHook = paintHook;
    return this;
  }

  paint(canvas: Canvas) {
    this.paintHook?.(canvas);
  }

  setPrePaintHook(paintHook: (canvas: Canvas) => void): Component {
    this.prePaintHook= paintHook;
    return this;
  }
  onPrePaint(canvas: Canvas): void {
    this.prePaintHook?.(canvas)
    
  }
  measure(bounds: LayoutBounds): Partial<LayoutBounds> {
    return {};
  }
  preferredSize(): Size {
    return {
      height: null,
      width: null,
    };
  }
  onEvent(event: EditorEvents) {
    for (const child of this.children()) {
      child.onEvent(event);
    }
  }
  index(): number {
    return this.ind;
  }
  setIndex(nval: number) {
    const p = this.parent();
    if (p) {
      assert(nval >= p.index(), "index cannot be less than parent");
    }
    for (const child of this.children()) {
      if (nval >= child.index()) {
        child.setIndex(nval + 1);
      }
    }

    this.ind = nval;

    return this;
  }
  positionMode(): PositionMode {
    return this.pm;
  }
  setPositionMode(nval: PositionMode): Component {
    this.pm = nval;
    return this;
  }
  setVisible(nval: boolean): Component {
    this.vs = nval;

    return this;
  }
  visible(): boolean {
    return this.vs;
  }
  margin(): Insets {
    return this.m;
  }
  setMargin(nmargin: Insets): Component {
    this.m = nmargin;
    return this;
  }
}
