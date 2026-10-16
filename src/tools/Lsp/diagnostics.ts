// Errors and warnings per file, from a language server, a linter or a build
import type { Position, Range } from "./types.js";

export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  source?: string;
  code?: string | number;
}

export type DiagnosticCounts = Record<DiagnosticSeverity, number>;

export class DiagnosticsStore {
  // replaces that file's list
  set(path: string, diagnostics: Diagnostic[]): void {
    throw new Error("not implemented");
  }

  // sorted by position
  get(path: string): Diagnostic[] {
    throw new Error("not implemented");
  }

  // one file's, or every file's
  counts(path?: string): DiagnosticCounts {
    throw new Error("not implemented");
  }

  // the first one after position, wrapping around
  next(path: string, position: Position): Diagnostic | undefined {
    throw new Error("not implemented");
  }

  previous(path: string, position: Position): Diagnostic | undefined {
    throw new Error("not implemented");
  }

  // called with the path that changed; returns a function that unsubscribes
  onChange(listener: (path: string) => void): () => void {
    throw new Error("not implemented");
  }
}
