// Reopening what was open last time
import type { EditorContext } from "../Editor/Editor.js";

// plain, JSON-safe data
export interface SessionData {
  files: { path: string; line: number; column: number }[];
  active?: string;
}

export function saveSession(ctx: EditorContext): SessionData {
  throw new Error("not implemented");
}

// opens the files in order with their cursors and focuses the active one;
// files that are gone are skipped
export function restoreSession(ctx: EditorContext, data: SessionData): void {
  throw new Error("not implemented");
}
