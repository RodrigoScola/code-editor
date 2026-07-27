import colors from "./colors.js";
import { assert } from "../assert.js";
import { DisplayComponent } from "./components.js";

export class Canvas implements Component {
  private h: number;
  private w: number;
  x: number = 0;
  y: number = 0;

  canvas: DisplayTile[][];
  private shadowCanvas: DisplayTile[][] = [];

  root: Component;

  constructor() {
    this.h = 80;
    this.w = 80;

    this.root = new DisplayComponent(this);

    this.canvas = new Array();
  }

  width(): number {
    return this.w;
  }
  height() {
    return this.h;
  }

  private createTile(x: number, y: number): DisplayTile {
    return {
      x: x,
      y: y,
      styles: {
        backgroundColor: colors.BACKGROUND_OFF,
        color: colors.FOREGROUND_OFF,
      },
    };
  }
  private resetCanvas() {
    this.canvas = [];
    for (let i = 0; i < this.height(); i++) {
      this.canvas.push([]);
      for (let j = 0; j < this.width(); j++) {
        this.canvas[i].push(this.createTile(j, i));
      }
    }
  }
  setHeight(nHeight: number): Component {
    // this is going to clear the whole previous canvas? do we want that?
    // just in case we need it in the future
    this.shadowCanvas = this.canvas.map((i) => ({ ...i })); // ! deep copies

    this.h = nHeight;

    this.root.setHeight(this.h);

    this.resetCanvas();

    return this;
  }
  addChildren(c: Component): Component {
    return this.root.addChildren(c);
  }
  children() {
    return this.root.children();
  }

  setWidth(nWidth: number): Canvas {
    // this is going to clear the whole previous canvas? do we want that?
    // just in case we need it in the future
    this.shadowCanvas = this.canvas.map((i) => ({ ...i })); // ! deep copies
    this.w = nWidth;

    this.canvas = new Array(this.h).map((a) => new Array(this.w));

    this.root.setWidth(this.w);

    this.resetCanvas();

    return this;
  }

  render() {
    return this.canvas.map((line) => line.map((item) => ` `));
  }
  startX() {
    return this.x;
  }
  startY() {
    return this.y;
  }
  build(map: DisplayTile[][] = this.canvas): DisplayTile[][] {
    if (map.length !== this.height()) {
      this.resetCanvas();
    }
    return this.root.build(map);
  }
  setStartX(nStartx: number): Component {
    this.x = nStartx;
    return this;
  }
  setStartY(nStarty: number): Component {
    this.y = nStarty;
    return this;
  }
}
