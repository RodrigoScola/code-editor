import { assert } from "../assert.js";
import colors from "./colors.js";

export class DisplayComponent implements Component {
  private static ID = 0;
  private id: number;
  private maxH: number | null = null;
  private maxW: number | null = null;
  private w: number;
  private h: number;
  private x: number;
  private y: number;
  s: ComponentStyles;

  private childs: Component[];

  p: Component | null;

  direction: "vertical" | "horizontal";

  constructor() {
    this.id = DisplayComponent.ID;
    DisplayComponent.ID++;

    this.childs = [];
    this.direction = "vertical";
    this.s = {
      backgroundColor: colors.BACKGROUND_OFF,
      color: colors.FOREGROUND_OFF,
    };

    this.p = null;
    this.h = 0;
    this.w = 0;
    this.x = 0;
    this.y = 0;
  }
  parent(): Component | null {
    return this.p;
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

  startX() {
    return this.x;
  }

  startY() {
    return this.y;
  }
  height() {
    return this.h;
  }
  width(): number {
    return this.w;
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

    this.setHeight(this.h);
    this.setWidth(this.w);

    return this;
  }
  setParent(c: Component): Component {
    this.p = c;
    this.h = this.p.height() ?? 0;
    this.w = this.p.width() ?? 0;
    this.x = this.p.startX() || 0;
    this.y = this.p.startY() || 0;
    return this;
  }
  setHeight(nHeight: number): Component {
    let parentHeight = this.p?.height() || 0;
    this.h = Math.min(nHeight, parentHeight);

    // * should take into account padding and margin at some point
    // * allow for maxHeight at some point but maybe not right now
    let remaining = this.h;
    let flexibleRemaining = this.childs.filter(
      (c) => c.maxHeight() == null,
    ).length;

    const b = (c: Component) => {
      if (this.direction === "horizontal") {
        // work on centering
        c.setHeight(this.maxHeight() || this.h);
      } else {
        const hasMax = c.maxHeight();
        let amount: number;

        if (hasMax != null) {
          amount = hasMax;
        } else {
          amount = Math.floor(remaining / flexibleRemaining);
          flexibleRemaining -= 1;
        }
        c.setHeight(amount);
        remaining -= amount;
      }
      return c;
    };

    this.childs = this.childs
      .sort(
        (a, b) =>
          Number(b.maxHeight() !== null) - Number(a.maxHeight() !== null),
      )
      .map((c) => b(c))
      .sort((a, b) => a.getId() - b.getId());

    let yOffset = this.startY();
    for (const c of this.childs) {
      c.setStartY(yOffset);
      if (this.direction !== "horizontal") {
        yOffset += c.height();
      }
    }

    return this;
  }

  setWidth(nWidth: number): Component {
    let parentWidth = this.p?.width() || 0;
    this.w = Math.min(nWidth, parentWidth);

    // * should take into account padding and margin at some point
    // * allow for maxHeight at some point but maybe not rght now

    let remaining = this.w;
    let flexibleRemaining = this.childs.filter(
      (c) => c.maxWidth() == null,
    ).length;

    const b = (c: Component) => {
      if (this.direction === "horizontal") {
        // work on centering
        const hasMax = c.maxWidth();
        let amount: number;

        if (hasMax != null) {
          amount = hasMax;
        } else {
          amount = Math.floor(remaining / flexibleRemaining);
          flexibleRemaining -= 1;
        }
        c.setWidth(amount);
        remaining -= amount;
      } else {
        const val = this.maxWidth() || this.w;
        c.setWidth(val);
      }
      return c;
    };

    this.childs = this.childs
      .sort(
        (a, b) => Number(b.maxWidth() !== null) - Number(a.maxWidth() !== null),
      )
      .map((c) => b(c))
      .sort((a, b) => a.getId() - b.getId());

    let xOffset = this.startX();
    for (const c of this.childs) {
      c.setStartX(xOffset);
      if (this.direction === "horizontal") {
        xOffset += c.width();
      }
    }

    return this;
  }

  children(): Component[] {
    return this.childs;
  }
  build(map: DisplayTile[][]): DisplayTile[][] {
    assert(
      map.length >= this.height(),
      `component has more height than map, got ${map.length}, expected: ${this.height()} `,
    );
    assert(
      map[0].length >= this.width(),
      `component has more width than map, expected ${this.width()}, got ${map[0].length}`,
    );

    for (let i = this.startY(); i < this.startY() + this.height(); i++) {
      for (let j = this.startX(); j < this.startX() + this.width(); j++) {
        const tile = map[i][j];

        assert(Boolean(tile), `tile should exist at ${j}, ${this.y}`);
        assert(
          j == tile.x,
          `they should have the same x, expected: ${tile.x}, got: ${i}`,
        );
        assert(
          i == tile.y,
          `they should have the same y, expected: ${tile.y}, got: ${j}`,
        );

        map[i][j].styles.backgroundColor = this.s.backgroundColor;
        map[i][j].styles.color = this.s.color;
      }
    }

    for (const child of this.childs) {
      child.build(map);
    }

    return map;
  }
  setStartX(nStartx: number): Component {
    this.x = nStartx;

    this.w = Math.min(this.w, (this.p?.width() ?? 0) - this.x);
    return this;
  }

  setStartY(nStartx: number): Component {
    this.y = nStartx;
    this.h = Math.min(this.h, (this.p?.height() ?? 0) - this.y);
    return this;
  }

  setDirection(direction: "vertical" | "horizontal") {
    this.direction = direction;

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
}

export class TextDisplay extends DisplayComponent {
  private text: string;
  constructor() {
    super();
    this.text = "";
  }
  setText(ntext: string) {
    this.text = ntext;
    return this;
  }
  build(map: DisplayTile[][]): DisplayTile[][] {
    let textInd = 0;

    for (let i = 0; i < this.text.length; i++) {
      map[this.startY()][this.startX() + i].display = this.text[textInd];
      map[this.startY()][this.startX() + i].styles = blendStyles(
        this.s,
        this.parent()?.styles(),
      );
      textInd++;
    }
    return map;
  }
}

function blendStyles(
  first: ComponentStyles,
  parent: ComponentStyles | null | undefined,
): ComponentStyles {
  return {
    backgroundColor:
      first.backgroundColor === colors.BACKGROUND_OFF
        ? parent?.backgroundColor || first.color
        : first.backgroundColor,
    color:
      first.color === colors.BACKGROUND_OFF
        ? parent?.color || first.color
        : first.color,
  };
}
