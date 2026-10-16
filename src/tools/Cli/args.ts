// The `code` command line (VS Code docs, "Command Line Interface"), local
// options only

export interface FileArg {
  path: string;
  // -g / --goto file:line[:column]
  line?: number;
  column?: number;
  // the file doesn't exist yet
  create?: boolean;
}

export interface ParsedArgs {
  files: FileArg[];
  folders: string[];
  // -d a b
  diff?: [string, string];
  // -m input1 input2 base result
  merge?: { input1: string; input2: string; base: string; result: string };
  newWindow: boolean;
  reuseWindow: boolean;
  wait: boolean;
  // -a / --remove: the workspace's folders
  add: string[];
  remove: string[];
  // "-": read from stdin
  stdin: boolean;
  locale?: string;
  profile?: string;
  // unknown options and wrong argument counts
  warnings: string[];
}

export interface ArgsOptions {
  cwd: string;
  platform: string;
  kindOf(path: string): "file" | "folder" | undefined;
}

export function parseArgs(argv: string[], options: ArgsOptions): ParsedArgs {
  throw new Error("not implemented");
}

export type VscodeUrl =
  | { kind: "file"; path: string; line?: number; column?: number }
  | { kind: "settings"; id: string; path?: undefined };

// vscode://file/path[:line[:column]] or vscode://settings/id; undefined
// for any other kind
export function parseVscodeUrl(url: string): VscodeUrl | undefined {
  throw new Error("not implemented");
}
