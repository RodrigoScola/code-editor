// The TERMINAL panel's terminals, with processes started through an
// injected spawn
import type { VirtualTerminal } from "./VirtualTerminal.js";

export type SpawnOptions = {
  cwd?: string;
  env: Record<string, string>;
  shell: string;
  args: string[];
};

export interface TerminalProcess {
  write(data: string): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (code: number) => void): void;
  kill(): void;
  hasChildProcesses?(): boolean;
}

export interface TerminalManagerSettings {
  // terminal.integrated.tabs.title / tabs.description templates
  tabsTitle?: string;
  tabsDescription?: string;
  splitCwd?: "workspaceRoot" | "initial" | "inherited";
  workspaceRoot?: string;
  // exact prompt -> reply
  autoReplies?: Record<string, string>;
  confirmOnKill?: "never" | "always" | "editor" | "panel";
  showExitAlert?: boolean;
  hideOnLastClosed?: boolean;
}

export class TerminalInstance {
  get id(): number {
    throw new Error("not implemented");
  }

  get buffer(): VirtualTerminal {
    throw new Error("not implemented");
  }

  title(): string {
    throw new Error("not implemented");
  }

  // fixes the title
  rename(title: string): void {
    throw new Error("not implemented");
  }

  write(data: string): void {
    throw new Error("not implemented");
  }

  // the text and Enter; bracketed paste for several lines when the shell
  // asked for it
  runText(text: string): void {
    throw new Error("not implemented");
  }

  cwd(): string | undefined {
    throw new Error("not implemented");
  }

  kill(): "killed" | "needsConfirmation" {
    throw new Error("not implemented");
  }
}

export class TerminalManager {
  constructor(options: {
    spawn: (options: SpawnOptions) => TerminalProcess;
    settings?: TerminalManagerSettings;
  }) {}

  // becomes active, in its own group
  create(options: { cwd?: string } = {}): TerminalInstance {
    throw new Error("not implemented");
  }

  // adds to the active group
  split(): TerminalInstance {
    throw new Error("not implemented");
  }

  unsplit(instance: TerminalInstance): void {
    throw new Error("not implemented");
  }

  groups(): TerminalInstance[][] {
    throw new Error("not implemented");
  }

  active(): TerminalInstance | undefined {
    throw new Error("not implemented");
  }

  focusNextGroup(): void {
    throw new Error("not implemented");
  }

  focusPreviousGroup(): void {
    throw new Error("not implemented");
  }

  panelVisible(): boolean {
    throw new Error("not implemented");
  }

  // exit alerts and the like
  messages(): string[] {
    throw new Error("not implemented");
  }
}

// ${...} variables filled in; ${separator} only between non-empty parts
export function formatTitle(template: string, values: Record<string, string>, separator: string): string {
  throw new Error("not implemented");
}

export interface TerminalMatch {
  row: number;
  column: number;
  length: number;
}

// wrapped rows are searched as one line
export function findInTerminal(
  term: VirtualTerminal,
  query: string,
  options: { caseSensitive?: boolean; regex?: boolean; wholeWord?: boolean },
): TerminalMatch[] {
  throw new Error("not implemented");
}
