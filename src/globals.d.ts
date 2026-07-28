interface Component {
  getId(): number;
  height(): number;
  width(): number;
  startX(): number;
  setStartX(nStartX: number): Component;
  setStartY(nStartY: number): Component;
  startY(): number;
  setHeight(nHeight: number): Component;
  setWidth(nWidth: number): Component;
  maxHeight(): number | null;
  setMaxH(nMax: number): Component;

  maxWidth(): number | null;
  setMaxW(nMax: number): Component;
  children(): Component[];
  parent(): Component | null;

  addChildren(c: Component[]): Component;
  setParent(c: Component): Component;
  addChildren(c: Component): Component;
  setDirection(dir: "horizontal" | "vertical"): Component;

  build(map: DisplayTile[][]): DisplayTile[][];
  styles: () => ComponentStyles | null;
  setStyles(sty: ComponentStyles): Component;
}

interface DisplayTile {
  x: number;
  y: number;
  display: string;
  styles: ComponentStyles;
}

interface ComponentStyles {
  backgroundColor: string;
  color: string;
}
