// Clickable links in terminal output (Ctrl+click)

export interface TerminalLink {
  text: string;
  start: number;
  end: number;
  // word: anything else between word separators (searches the workspace)
  type: "url" | "file" | "folder" | "word";
  path?: string;
  // 1-based, as printed
  line?: number;
  column?: number;
}

export interface DetectLinksOptions {
  // relative paths resolve against cwd, ~ against home
  cwd: string;
  home?: string;
  // "file" | "folder", or undefined when nothing is there
  exists(path: string): "file" | "folder" | (string & {}) | undefined;
  wordSeparators?: string;
}

export function detectLinks(line: string, options: DetectLinksOptions): TerminalLink[] {
  throw new Error("not implemented");
}
