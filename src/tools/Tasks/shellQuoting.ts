// Building a shell task's command line (tasks docs: "Command and arguments
// quoting")

export type ShellKind = "bash" | "pwsh" | "cmd";

// escape: bash \, pwsh `, cmd ^; strong: bash/pwsh '...', cmd "...";
// weak: "..." everywhere
export type ShellQuoting = "escape" | "strong" | "weak";

export interface ShellArg {
  value: string;
  quoting: ShellQuoting | (string & {});
}

// bash also covers sh, zsh, fish and git bash; pwsh covers powershell
export function shellKind(executable: string): ShellKind {
  throw new Error("not implemented");
}

// plain strings without spaces or special characters are left alone
export function buildCommandLine(
  command: string | ShellArg,
  args: (string | ShellArg)[],
  shell: ShellKind,
): string {
  throw new Error("not implemented");
}
