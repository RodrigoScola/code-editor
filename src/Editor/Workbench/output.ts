// The Output panel (Ctrl+Shift+U)

export interface OutputChannel {
  name: string;
  append(text: string): void;
  appendLine(text: string): void;
  replace(text: string): void;
  clear(): void;
  content(): string;
}

export type LogLevel = "trace" | "debug" | "info" | "warning" | "error" | "off";

// lines look like "2024-03-05 07:08:09.010 [info] message"
export interface LogOutputChannel extends OutputChannel {
  trace(message: string): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  // info by default
  setLevel(level: LogLevel): void;
}

export class OutputService {
  // the same one each time for a name
  channel(name: string): OutputChannel {
    throw new Error("not implemented");
  }

  logChannel(name: string, options: { clock?: () => Date } = {}): LogOutputChannel {
    throw new Error("not implemented");
  }

  // sorted
  names(): string[] {
    throw new Error("not implemented");
  }

  show(name: string): void {
    throw new Error("not implemented");
  }

  active(): string | undefined {
    throw new Error("not implemented");
  }
}
