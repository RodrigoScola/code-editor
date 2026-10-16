// keybindings.json and resolving key presses
import type { WhenContext } from "./whenClause.js";

export interface KeybindingRule {
  // "ctrl+k ctrl+c": chords separated by a space
  key: string;
  // "-command" removes matching default rules; "" disables the key
  command: string;
  when?: string;
  args?: unknown;
}

// a removal rule ("-command") without a key removes the command from
// every key
export type UserKeybindingRule = Omit<KeybindingRule, "key"> & { key?: string };

export type KeyPress =
  | { kind: "command"; command: string; args: unknown }
  // waiting for the second part of a chord
  | { kind: "chord"; command?: undefined; args?: undefined }
  | { kind: "none"; command?: undefined; args?: undefined };

// "Shift+Ctrl+P" -> "ctrl+shift+p": modifiers in the order ctrl, shift,
// alt, meta/cmd/win
export function normalizeKey(key: string): string {
  throw new Error("not implemented");
}

export class KeybindingResolver {
  // user rules come after defaults
  constructor(defaults: KeybindingRule[], userRules: UserKeybindingRule[], options: { platform: string }) {}

  // rules are checked from the last to the first; the first whose key and
  // when match wins
  press(key: string, context: WhenContext): KeyPress {
    throw new Error("not implemented");
  }

  // the commands bound to the same key
  conflicts(key: string): string[] {
    throw new Error("not implemented");
  }
}

// "Ctrl+Shift+P", or "⇧⌘P" on macOS
export function keyLabel(key: string, platform: string): string {
  throw new Error("not implemented");
}

// words in the command, "@source:user", a quoted key ("ctrl+k")
export function searchKeybindings<R extends KeybindingRule & { source?: string }>(
  rules: R[],
  query: string,
): R[] {
  throw new Error("not implemented");
}
