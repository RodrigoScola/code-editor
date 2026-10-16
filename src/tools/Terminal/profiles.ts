// Terminal profiles (terminal.integrated.profiles.<platform>)
import type { ShellKind } from "../Tasks/shellQuoting.js";

export interface TerminalProfile {
  name: string;
  path: string;
  args: string[];
  // null removes a variable
  env?: Record<string, string | null>;
  icon?: string;
  // keep the profile name as the title
  overrideName?: boolean;
}

// detected shells plus configured ones; a configured profile set to null
// hides a detected one
export function resolveProfiles(options: {
  platform: string;
  settings: Record<string, unknown>;
  detected: TerminalProfile[];
}): TerminalProfile[] {
  throw new Error("not implemented");
}

// terminal.integrated.defaultProfile.<platform>, else $SHELL on linux/osx,
// else PowerShell on Windows
export function defaultProfile(options: {
  platform: string;
  settings: Record<string, unknown>;
  profiles: TerminalProfile[];
  env: Record<string, string | undefined>;
}): TerminalProfile {
  throw new Error("not implemented");
}

export interface TerminalLaunchConfig {
  path: string;
  args: string[];
  // process env + terminal.integrated.env.<platform> + profile env
  env: Record<string, string>;
  name: string;
}

// ${env:X} and other variables resolved
export function resolveLaunchConfig(
  profile: TerminalProfile,
  options: {
    platform: string;
    settings: Record<string, unknown>;
    env: Record<string, string | undefined>;
    variables?: Record<string, string>;
  },
): TerminalLaunchConfig {
  throw new Error("not implemented");
}

// for dropping a file into the terminal
export function escapePathForShell(path: string, shell: ShellKind): string {
  throw new Error("not implemented");
}
