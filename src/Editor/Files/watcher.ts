// File system watchers report bursts of raw events; they are merged before
// anything reacts

export interface FileEvent {
  type: "added" | "changed" | "deleted";
  path: string;
}

// in order of first appearance: added + deleted -> nothing, deleted +
// added -> changed, added + changed -> added; a deleted folder swallows
// the events inside it
export function coalesceEvents(events: FileEvent[]): FileEvent[] {
  throw new Error("not implemented");
}

// drops events under files.watcherExclude patterns
export function filterEvents(events: FileEvent[], excludeGlobs: string[]): FileEvent[] {
  throw new Error("not implemented");
}
