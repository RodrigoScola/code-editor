// What the terminal sends to the shell for each key (xterm's encoding)

export interface TerminalKey {
  // a character, or "Enter" "Backspace" "Tab" "Escape" "ArrowUp" "Home"
  // "End" "PageUp" "PageDown" "Insert" "Delete" "F1".."F12"
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

// modifiers on special keys are xterm's 1 + shift(1) + alt(2) + ctrl(4)
export function encodeKey(event: TerminalKey, modes: { applicationCursorKeys?: boolean }): string {
  throw new Error("not implemented");
}

// line breaks become \r; bracketed paste wraps in ESC[200~ ... ESC[201~
export function encodePaste(text: string, modes: { bracketedPaste: boolean }): string {
  throw new Error("not implemented");
}

// terminal.integrated.enableMultiLinePasteWarning
export function needsPasteWarning(
  text: string,
  options: { bracketedPaste: boolean; setting: "auto" | "always" | "never" },
): boolean {
  throw new Error("not implemented");
}
