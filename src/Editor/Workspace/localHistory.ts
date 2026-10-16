// Timeline > Local History
import type { GlobExpression } from "../../tools/Search/glob.js";

export interface TimelineEntry {
  id: string;
  // ms
  timestamp: number;
  source: string;
  label?: string;
}

export interface LocalHistoryOptions {
  maxEntries?: number;
  // bytes
  maxFileSize?: number;
  // seconds: an entry this close to the last one from the same source
  // replaces it
  mergeWindow?: number;
  exclude?: GlobExpression;
  // ms
  clock?: () => number;
}

export class LocalHistory {
  constructor(options: LocalHistoryOptions) {}

  add(path: string, content: string, source = "File Saved"): void {
    throw new Error("not implemented");
  }

  // newest first
  entries(path: string): TimelineEntry[] {
    throw new Error("not implemented");
  }

  content(id: string): string | undefined {
    throw new Error("not implemented");
  }

  rename(id: string, label: string): void {
    throw new Error("not implemented");
  }

  remove(id: string): void {
    throw new Error("not implemented");
  }

  // paths with history (Find Entry to Restore)
  files(): string[] {
    throw new Error("not implemented");
  }
}

// one list, newest first
export function mergeTimeline(local: TimelineEntry[], commits: TimelineEntry[]): TimelineEntry[] {
  throw new Error("not implemented");
}
