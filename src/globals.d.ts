interface Component {
  getId(): number;
  layout: () => LayoutBounds;
  setLayout: (nLayout: LayoutBounds) => Component;

  preferredSize(): Size;

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
  direction(): "horizontal" | "vertical";

  paint(canvas: Canvas): void;
  styles: () => ComponentStyles | null;
  setStyles(sty: Partial<ComponentStyles>): Component;

  measure(bounds: LayoutBounds): Partial<LayoutBounds>;
}

interface Size {
  width: number | null;
  height: number | null;
}

type EditingModes = "visual" | "insert" | "command";

interface DisplayTile {
  x: number;
  y: number;
  display: string;
  styles: ComponentStyles;
}
interface LayoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ComponentStyles {
  backgroundColor: string;
  color: string;
}
