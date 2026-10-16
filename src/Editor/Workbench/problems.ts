// The Problems panel (Ctrl+Shift+M) over the diagnostics store
import type { Diagnostic, DiagnosticsStore } from "../../tools/Lsp/diagnostics.js";
import type { Position } from "../../tools/Lsp/types.js";

export interface Problem extends Diagnostic {
  path: string;
}

export interface ProblemGroup {
  path: string;
  // errors first, then by position
  problems: Problem[];
}

export class ProblemsView {
  constructor(store: DiagnosticsStore) {}

  // files sorted by path
  groups(): ProblemGroup[] {
    throw new Error("not implemented");
  }

  // words match message, source, code or path; a glob keeps matching
  // files; "!" in front excludes
  setFilter(text: string): void {
    throw new Error("not implemented");
  }

  setSeverities(severities: { errors: boolean; warnings: boolean; infos: boolean }): void {
    throw new Error("not implemented");
  }

  setActiveFileOnly(path: string | null): void {
    throw new Error("not implemented");
  }

  // of what is shown
  counts(): { errors: number; warnings: number; infos: number } {
    throw new Error("not implemented");
  }

  // F8 order: the rest of this file, then the next files by path, wrapping
  next(fromPath: string, fromPosition: Position): Problem | undefined {
    throw new Error("not implemented");
  }
}
