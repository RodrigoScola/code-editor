type EditorEvents = EditorModeEvent | SubmitCommandEvent;

type Direction = "vertical" | "horizontal";

type EditorModeEvent = {
  name: "editorModeChange";
  mode: EditingModes;
};

type SubmitCommandEvent = {
  name: "submitCommand";
};

type PositionMode = "normal" | "absolute" | "fixed";
type TodoPositionModes = "relative" | "sticky";

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
  display(): string;
  setDisplay: (nval: string) => ComponentStyles;
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
interface ViewPorts {
  firstLine: number;
  firstColumn: number;
  visibleLines: number;
  visibleColumns: number;
  bufferToViewPort(bufferPosition: Point): Point;
  ensureVisible(width: number, height: number): void;
  screenToBuffer(screenPosition: Point): Point;
}
