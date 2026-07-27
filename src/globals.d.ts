interface Component {
  height: () => number;
  width: () => number;
  startX: () => number;
  setStartX: (nStartx: number) => Component;
  setStartY: (nStarty: number) => Component;
  startY: () => number;
  setHeight: (nHeight: number) => Component;
  setWidth: (nWidth: number) => Component;
  children: () => Component[];
  addChildren: (c: Component) => Component;
  build: (map: DisplayTile[][]) => DisplayTile[][];
}

interface DisplayTile {
  x: number;
  y: number;
  styles: ComponentStyles;
}

interface ComponentStyles {
  backgroundColor: string;
  color: string;
}
