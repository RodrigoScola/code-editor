// Shell integration: the shell marks its prompt and commands with escape
// sequences (633 VS Code, 133 FinalTerm, 1337 iTerm2, 7 cwd)
import type { VirtualTerminal } from "./VirtualTerminal.js";

export interface ShellCommand {
  command: string;
  exitCode?: number;
  cwd?: string;
  promptLine: number;
  outputStart: number;
  outputEnd: number;
}

export class ShellIntegration {
  // nonce: 633;E with another nonce is ignored
  constructor(term: VirtualTerminal, options: { nonce?: string } = {}) {}

  // finished commands, oldest first
  commands(): ShellCommand[] {
    throw new Error("not implemented");
  }

  cwd(): string | undefined {
    throw new Error("not implemented");
  }

  quality(): "none" | "basic" | "rich" {
    throw new Error("not implemented");
  }

  // default: no exit code
  decoration(command: ShellCommand): "success" | "error" | "default" {
    throw new Error("not implemented");
  }

  output(command: ShellCommand): string[] {
    throw new Error("not implemented");
  }

  // the command whose prompt is before the line (Ctrl+Up)
  previousCommand(line: number): ShellCommand | undefined {
    throw new Error("not implemented");
  }

  nextCommand(line: number): ShellCommand | undefined {
    throw new Error("not implemented");
  }

  // newest first, no repeats
  recentCommands(): string[] {
    throw new Error("not implemented");
  }

  recentDirectories(): string[] {
    throw new Error("not implemented");
  }
}

// oldest first
export function parseHistoryFile(text: string, shell: "bash" | "zsh" | "fish"): string[] {
  throw new Error("not implemented");
}
