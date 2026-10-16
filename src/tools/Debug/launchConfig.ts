// launch.json

export interface Presentation {
  hidden?: boolean;
  group?: string;
  order?: number;
}

// type, request and name are required; the rest depends on the debugger
export interface LaunchConfiguration {
  type: string;
  request: string;
  name: string;
  presentation?: Presentation;
  [key: string]: unknown;
}

export interface Compound {
  name: string;
  // configuration names, or { folder, name } in a multi-root workspace
  configurations: (string | { folder: string; name: string })[];
  stopAll: boolean;
  preLaunchTask?: string;
  presentation?: Presentation;
}

export interface LaunchConfig {
  configurations: LaunchConfiguration[];
  compounds: Compound[];
  errors: string[];
}

export interface LaunchConfigOptions {
  // process.platform: picks the "windows" / "linux" / "osx" section
  platform: string;
  // the "launch" user setting, added after the workspace ones
  userLaunch?: {
    configurations?: Record<string, unknown>[];
    compounds?: Record<string, unknown>[];
  };
}

export function parseLaunchConfig(
  jsonc: string,
  options: LaunchConfigOptions,
): LaunchConfig {
  throw new Error("not implemented");
}

// names in the Run and Debug dropdown, compounds included
export function dropdownEntries(config: LaunchConfig): string[] {
  throw new Error("not implemented");
}
