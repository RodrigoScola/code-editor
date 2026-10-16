// Terminals that survive a restart: what was on screen is saved as escape
// sequences that draw the same screen again
import type { VirtualTerminal } from "./VirtualTerminal.js";

// the screen, its colors and styles, the cursor and at most scrollback
// lines of scrollback (default 100)
export function serializeTerminal(term: VirtualTerminal, options: { scrollback?: number } = {}): string {
  throw new Error("not implemented");
}

export interface PersistenceSettings {
  enablePersistentSessions: boolean;
  reviveProcess: "onExit" | "onExitAndWindowClose" | "never" | (string & {});
}

// reload: the editor restarted itself
export function shouldRevive(
  settings: PersistenceSettings,
  reason: "reload" | "quit" | "windowClose",
): boolean {
  throw new Error("not implemented");
}
