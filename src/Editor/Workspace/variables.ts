// Variable substitution in launch.json, tasks.json and some settings
// (VS Code's Variables Reference)

export interface VariableInput {
  id: string;
  type: "promptString" | "pickString" | "command";
  description?: string;
  default?: string;
  password?: boolean;
  options?: (string | { label: string; value: string })[];
  command?: string;
  args?: unknown;
}

export interface VariableContext {
  // process.platform: picks the path separator
  platform: string;
  workspaceFolder?: string;
  // name -> path, for ${workspaceFolder:Name}
  workspaceFolders?: Record<string, string>;
  // the active editor's file; ${file} without one is an error
  file?: string;
  lineNumber?: number;
  columnNumber?: number;
  selectedText?: string;
  userHome?: string;
  execPath?: string;
  cwd?: string;
  pathSeparator?: string;
  env: Record<string, string | undefined>;
  // undefined for a missing setting, which is an error
  config(key: string): unknown;
  commands: Record<string, () => unknown>;
  inputs: VariableInput[];
  ui: {
    prompt(input: VariableInput): Promise<string>;
    pick(input: VariableInput): Promise<string>;
  };
  defaultBuildTask?: string;
}

// every string inside value resolved (objects and arrays are walked, keys
// are not)
export function resolveVariables<T>(value: T, context: VariableContext): Promise<T> {
  throw new Error("not implemented");
}
