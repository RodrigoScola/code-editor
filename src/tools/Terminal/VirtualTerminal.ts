// The screen model behind an integrated terminal panel: a shell (through a
// pty) writes bytes, this turns them into a grid of cells the UI can draw

// null (default), 0-255 (palette; 0-7 normal, 8-15 bright), or "#rrggbb"
export type TerminalColor = number | string | null;

export interface TerminalCell {
  char: string;
  fg: TerminalColor;
  bg: TerminalColor;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  inverse: boolean;
  invisible: boolean;
  // 2 for the first cell of a wide character, 0 for its second half
  width: number;
  // the OSC 8 hyperlink on the cell
  link?: string;
}

export interface TerminalModes {
  applicationCursorKeys: boolean;
  bracketedPaste: boolean;
  cursorVisible: boolean;
  autoWrap: boolean;
  insert: boolean;
  alternateScreen: boolean;
}

export interface CursorStyle {
  shape: "block" | "underline" | "bar";
  blink: boolean;
}

export interface VirtualTerminalOptions {
  // lines kept after they scroll off the top
  scrollback?: number;
  // what the terminal answers (device status, ...)
  onData?(data: string): void;
  onBell?(): void;
}

export class VirtualTerminal {
  constructor(cols: number, rows: number, options: VirtualTerminalOptions = {}) {}

  // escape sequences and UTF-8 may be cut anywhere between writes
  write(data: string | Uint8Array): void {
    throw new Error("not implemented");
  }

  // the row's characters, right-trimmed
  lineText(y: number): string {
    throw new Error("not implemented");
  }

  cell(x: number, y: number): TerminalCell {
    throw new Error("not implemented");
  }

  cursor(): { x: number; y: number } {
    throw new Error("not implemented");
  }

  // lines that scrolled off the top, oldest first
  scrollback(): string[] {
    throw new Error("not implemented");
  }

  // set by OSC 0 / OSC 2
  title(): string {
    throw new Error("not implemented");
  }

  modes(): TerminalModes {
    throw new Error("not implemented");
  }

  // DECSCUSR
  cursorStyle(): CursorStyle {
    throw new Error("not implemented");
  }

  // reflows wrapped lines
  resize(cols: number, rows: number): void {
    throw new Error("not implemented");
  }
}
