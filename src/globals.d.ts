type EditorEvents = EditorModeEvent;

type EditorModeEvent = {
  name: "editorModeChange";
  mode: EditingModes;
};

interface Component {
  getId(): number;
  layout: () => LayoutBounds;
  setLayout: (nLayout: LayoutBounds) => Component;
  onEvent(e: EditorEvents): void;
  name(): string | null | undefined;
  setName(newName: string): Component;
  findChildrenByName(nm: string): Component | null;

  preferredSize(): Size;
  padding(): Insets;
  contentLayout(): LayoutBounds;

  setPadding(nPadding: Insets): Component;

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

type Insets = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

interface Size {
  width: number | null;
  height: number | null;
}

type EditingModes = "normal" | "visual" | "insert" | "command";

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

interface EditorMode {
  handleKey(key: KeyEvent, ctx: EditorContext);
}

interface KeyEvent {
  token: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}
