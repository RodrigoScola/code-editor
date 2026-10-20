type EditorEvents = EditorModeEvent | SubmitCommandEvent | WorkspaceChangeEvent;
type DisplayTypes = "flex" | "none";

type DisplayDirection = "vertical" | "horizontal";
type Directions = "left" | "right" | "up" | "down";
type Size = number | "auto" | `${number}%` | "fit-content";

type EditorModeEvent = {
  name: "editorModeChange";
  mode: EditingModes;
};

interface MeasureConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

interface MeasuredSize {
  width: number;
  height: number;
}

type SubmitCommandEvent = {
  name: "submitCommand";
};
type WorkspaceChangeEvent = {
  name: "workspaceChangeEvent";
  workspace: string;
};

type PositionMode = "normal" | "absolute" | "fixed";
type TodoPositionModes = "relative" | "sticky";

type Insets = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

interface VisualSize {
  width: number | null;
  height: number | null;
}

type EditingModes = "normal" | "visual" | "insert" | "command";

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
  update(line: number, content: string);
  content(): string;
  removeRange(start: number, end: number): string;
  insertAt(start: number, content: string): number;
  index(ind: number): { line: number; character: number };
  offsetOf(line: number, column: number): number;
  range(start: number, end?: number): string;
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

type BorderDisplay = {
  top_right: string;
  top_left: string;
  bottom_left: string;
  bottom_right: string;
  left: string;
  right: string;
  top: string;
  bottom: string;
};

interface WindowLike {
  contentLayout(): LayoutBounds;
  viewport(): ViewPort;
  buffer(): BufferLike;
}

type GitEntryStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "type changed"
  | "unmerged/conflict"
  | "unknown"
  | "untracked"
  | "ignored"
  | "broken pairing";

type GitStatus = {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  gone: boolean;
  files: GitFile[];
};

type ColorOptionType = "rgb" | "hsl" | "hex" | "ansi";

type MouseInputKind = "mouse";
type KeyboardInputKind = "keyboard";

type InputEventKind = MouseInputKind | KeyboardInputKind;
type MouseButtons = "left" | "middle" | "right" | null;
type MouseAction =
  | "press"
  | "release"
  | "drag"
  | "move"
  | "wheelUp"
  | "wheelDown";

interface InputMouseEvent {
  kind: MouseInputKind;
  action: MouseAction;
  button: MouseButtons | null;
  position: Point;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

interface KeyEvent {
  token: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}
