import colors from "./colors.js";
import { assert } from "../assert.js";
import { DisplayComponent } from "./components.js";

export class Canvas implements Component {
  private h: number = 0;
  private w: number = 0;
  x: number = 0;
  y: number = 0;

  canvas: DisplayTile[][];
  private shadowCanvas: DisplayTile[][] = [];

  root: Component;

  constructor() {
    this.root = new DisplayComponent();

    this.root.setParent(this);

    this.canvas = new Array();
  }
  maxHeight() {
    return this.h;
  }
  setMaxH(nmh: number) {
    this.h = nmh;
    return this;
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
      display: " ",
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
  addChildren(c: Component[]): Component;
  addChildren(c: Component): Component;
  addChildren(c: Component | Component[]): Component {
    if (Array.isArray(c)) {
      return this.root.addChildren(c);
    }
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
    this.root.setWidth(this.w);

    this.canvas = new Array(this.h).map((a) => new Array(this.w));

    this.resetCanvas();

    return this;
  }

  render() {
    const rows: string[] = [];
    for (let i = this.startY(); i < this.startY() + this.height(); i++) {
      let row = "";
      for (let j = this.startX(); j < this.startX() + this.width(); j++) {
        let tile = this.canvas[i][j];
        assert(
          tile.display.length == 1,
          "cannot display more things on one cell",
        );

        row += `${tile.styles.backgroundColor}${tile.styles.color}${tile.display}${colors.BACKGROUND_OFF}${colors.FOREGROUND_OFF}`;
      }
      rows.push(row);
    }
    return rows.join("\r\n");
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
    map = this.root.build(map);

    return map;
  }
  setStartX(nStartx: number): Component {
    this.x = nStartx;
    return this;
  }
  setStartY(nStarty: number): Component {
    this.y = nStarty;
    return this;
  }
  getId(): number {
    return -1;
  }
  setParent(c: Component): Component {
    return this.root.setParent(c);
  }
  parent(): Component | null {
    return this.root.parent();
  }
  setDirection(dir: "horizontal" | "vertical"): Component {
    return this.root.setDirection(dir);
  }
  maxWidth(): number | null {
    return this.w;
  }
  setMaxW(nMax: number): Component {
    this.w = nMax;
    return this;
  }
  styles(): ComponentStyles | null {
    return this.root.styles();
  }
  setStyles(sty: ComponentStyles): Component {
    return this.root.setStyles(sty);
  }
}
