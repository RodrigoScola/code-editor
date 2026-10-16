// Notifications: the bell in the status bar, toasts in the corner

export type NotificationSeverity = "info" | "warning" | "error";

export interface NotificationOptions {
  severity: NotificationSeverity;
  message: string;
  source?: string;
  actions?: string[];
}

export interface NotificationHandle {
  // the chosen action, undefined if closed without one
  result: Promise<string | undefined>;
  close(): void;
}

// a notification or a progress in the center
export interface NotificationEntry {
  severity: NotificationSeverity;
  message: string;
  source?: string;
  actions?: string[];
  // progress
  worked?: number;
  total?: number;
  choose(action: string): void;
}

export interface ProgressHandle {
  report(increment: number, message?: string): void;
  done(): void;
}

export class NotificationCenter {
  // the same message, source and severity is not shown twice while the
  // first is still there
  notify(options: NotificationOptions): NotificationHandle {
    throw new Error("not implemented");
  }

  progress(options: { message: string; total?: number }): ProgressHandle {
    throw new Error("not implemented");
  }

  // what is showing now
  toasts(): NotificationEntry[] {
    throw new Error("not implemented");
  }

  // everything not yet cleared
  all(): NotificationEntry[] {
    throw new Error("not implemented");
  }

  // no toasts, but everything still goes to the center
  setDoNotDisturb(on: boolean): void {
    throw new Error("not implemented");
  }

  clearAll(): void {
    throw new Error("not implemented");
  }
}
