import { Canvas } from "./canvas.js";
import colors from "./colors.js";

export class DisplayComponent implements Component {
  private static ID = 0;
  private id: number;
  private maxH: number | null = null;
  private maxW: number | null = null;
  s: ComponentStyles;

  private childs: Component[];

  p: Insets = { bottom: 0, top: 0, left: 0, right: 0 };
  pr: Component | null;
  private l: LayoutBounds;

  private d: "vertical" | "horizontal";

  constructor() {
    this.id = DisplayComponent.ID;
    DisplayComponent.ID++;
    this.l = { x: 0, y: 0, width: 0, height: 0 };

    this.childs = [];
    this.d = "vertical";
    this.s = {
      backgroundColor: colors.BACKGROUND_OFF,
      color: colors.FOREGROUND_OFF,
    };

    this.pr = null;
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
    this.s = {
      ...this.s,
      ...sty,
    };
    return this;
  }

  paint(canvas: Canvas) {}
  measure(bounds: LayoutBounds): Partial<LayoutBounds> {
    return {};
  }
  preferredSize(): Size {
    return {
      height: null,
      width: null,
    };
  }
}

