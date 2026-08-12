type EditorEvents = EditorModeEvent | SubmitCommandEvent;

type EditorModeEvent = {
  name: "editorModeChange";
  mode: EditingModes;
};

type SubmitCommandEvent = {
  name: "submitCommand";
};

type PositionMode = "normal" | "absolute" | "fixed";
type TodoPositionModes = "relative" | "sticky";

interface Component {
  index(): number;

  positionMode(): PositionMode;
  setPositionMode(nval: PositionMode): Component;
  setIndex: (nval: number) => Component;
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

interface EditorMode {
  handleKey(key: KeyEvent, ctx: EditorContext);
}

type Point = { x: number; y: number };

interface KeyEvent {
  token: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

interface EditorFile {
  read(): string;
  write(content: string): void;
  path(): string;
}

interface BufferLike {
  at(line: number): string | undefined;
  count(): number;
}

interface ComponentStyles {
  backgroundColor: () => string;
  setBackgroundColor: (nval: string) => ComponentStyles;
  color: () => string;
  setColor: (nval: string) => ComponentStyles;
  isBold: () => boolean;
  setBold: (nval: boolean) => ComponentStyles;
  isDim: () => boolean;
  setDim: (nval: boolean) => ComponentStyles;
  isItalic: () => boolean;
  setItalic: (nval: boolean) => ComponentStyles;
  isUnderline: () => boolean;
  setUnderline: (nval: boolean) => ComponentStyles;
  isStrikeThrough: () => boolean;
  setStrikeThrough: (nval: boolean) => ComponentStyles;
  isInverse: () => boolean;
  setInverse: (nval: boolean) => ComponentStyles;
  isBlink: () => boolean;
  setBlink: (nval: boolean) => ComponentStyles;
  isHidden: () => boolean;
  setHidden: (nval: boolean) => ComponentStyles;
}
