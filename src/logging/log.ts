import util from "node:util";

type LogListener = (entry: LogEntry) => void;

export class Logger {
  private entries: LogEntry[] = [];
  private listeners = new Set<LogListener>();

  // only the newest `max` entries are kept so memory can't grow forever
  constructor(private readonly max = 1000) {}

  add(level: LogLevel, message: any) {
    const entry: LogEntry = { time: new Date(), level, message };

    this.entries.push(entry);
    if (this.entries.length > this.max) {
      this.entries.shift();
    }

    for (const listener of this.listeners) {
      listener(entry);
    }
  }

  // stored entries, oldest first, so late subscribers can catch up
  history(): readonly LogEntry[] {
    return this.entries;
  }

  clear() {
    this.entries = [];
  }

  // returns a function that removes the listener again
  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  static format(entry: LogEntry) {
    const time = entry.time.toTimeString().slice(0, 8);
    return `${time} ${entry.level.toUpperCase().padEnd(5)} ${entry.message}`;
  }
}

export const logger = new Logger();

export type LogEntry = {
  time: Date;
  level: LogLevel;
  message: any;
};

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

const LEVELS: LogLevel[] = ["log", "info", "warn", "error", "debug"];

/*
 * Sends console.* to `sink` instead of stdout, where it would be drawn over
 * the editor. Messages are formatted like console.log does (%s, %d, objects).
 *
 * Returns a function that puts the original console methods back.
 */
export function captureLogs(sink: (level: LogLevel, message: string) => void) {
  const original = new Map(LEVELS.map((level) => [level, console[level]]));

  for (const level of LEVELS) {
    console[level] = (...args: unknown[]) => {
      sink(level, util.format(...args));
    };
  }

  return () => {
    for (const [level, fn] of original) {
      console[level] = fn;
    }
  };
}
