import { assert } from "../assert.js";
import colors from "./colors.js";

export class DisplayComponent implements Component {
  private w: number;
  private h: number;
  private x: number;
  private y: number;
  styles: ComponentStyles;

  private childs: Component[];

  parent: Component;

  direction: "vertical" | "horizontal";

  constructor(parent: Component) {
    this.parent = parent;
    this.h = this.parent.height();
    this.w = this.parent.width();
    this.childs = [];
    this.direction = "vertical";
    this.styles = {
      backgroundColor: colors.BACKGROUND_OFF,
      color: colors.FOREGROUND_OFF,
    };

    this.x = this.parent.startX();
    this.y = this.parent.startY();
  }

  startX() {
    setStartX: (nStartx: number) => Component;
    setStartY: (nStarty: number) => Component;
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

  addChildren(c: Component): Component {
    this.childs.push(c);

    for (const c of this.childs) {
      if (this.direction === "horizontal") {
        c.setHeight(this.h);
        c.setWidth(this.w / this.childs.length);
      } else if (this.direction === "vertical") {
        c.setHeight(this.h / this.childs.length);
        c.setWidth(this.w);
      } else {
        throw new Error("invalid direction: " + this.direction);
      }
    }

    return this;
  }
  setHeight(nHeight: number): Component {
    this.h = nHeight;

    // * should take into account padding and margin at some point
    // * allow for maxHeight at some point but maybe not right now

    for (const c of this.childs) {
      if (this.direction === "horizontal") {
        c.setHeight(this.h);
      } else if (this.direction === "vertical") {
        c.setHeight(this.h / this.childs.length);
      } else {
        throw new Error("invalid direction: " + this.direction);
      }
    }

    return this;
  }

  setWidth(nWidth: number): Component {
    this.w = nWidth;

    // * should take into account padding and margin at some point
    // * allow for maxHeight at some point but maybe not right now

    for (const c of this.childs) {
      if (this.direction === "horizontal") {
        c.setWidth(this.w / this.childs.length);
      } else if (this.direction === "vertical") {
        c.setWidth(this.w);
      } else {
        throw new Error("invalid direction: " + this.direction);
      }
    }

    return this;
  }

  children(): Component[] {
    return this.childs;
  }
  build(map: DisplayTile[][]): DisplayTile[][] {
    assert(map.length >= this.height(), "component has more height than map ");
    assert(map[0].length >= this.width(), "component has more width than map ");

    for (let i = this.startY(); i < this.startY() + this.height(); i++) {
      for (let j = this.startX(); j < this.startX() + this.width(); j++) {
        const tile = map[i][j];
        assert(Boolean(tile), "tile should exist");
        assert(
          j == tile.x,
          `they should have the same x, expected: ${tile.x}, got: ${i}`,
        );
        assert(
          i == tile.y,
          `they should have the same y, expected: ${tile.y}, got: ${j}`,
        );
        map[i][j].styles.backgroundColor = this.styles.backgroundColor;
        map[i][j].styles.color = this.styles.color;
      }
    }

    for (const child of this.childs) {
      child.build(map);
    }

    return map;
  }
  setStartX(nStartx: number): Component {
    this.x = nStartx;
    this.w = Math.min(this.w, this.parent.width() - this.x);
    return this;
  }

  setStartY(nStartx: number): Component {
    this.y = nStartx;
    this.h = Math.min(this.h, this.parent.height() - this.y);
    return this;
  }
}
