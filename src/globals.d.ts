interface Component {
  getId: () => number;
  height: () => number;
  width: () => number;
  startX: () => number;
  setStartX: (nStartx: number) => Component;
  setStartY: (nStarty: number) => Component;
  startY: () => number;
  setHeight: (nHeight: number) => Component;
  setWidth: (nWidth: number) => Component;
  maxHeight: () => number | null;
  setMaxH: (nmax: number) => Component;
  children: () => Component[];
  addChildren: (c: Component) => Component;
  build: (map: DisplayTile[][]) => DisplayTile[][];
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
