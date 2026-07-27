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
  children(): Component[];

  addChildren(c: Component[]): Component;
  addChildren(c: Component): Component;

  build(map: DisplayTile[][]): DisplayTile[][];
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
