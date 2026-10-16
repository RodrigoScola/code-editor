// VS Code problem matchers (Vim errorformat). Positions are 0-based.

export type Severity = "error" | "warning" | "info";

// parseProblems(): the simple tsc / gcc formats
export interface Problem {
  path: string;
  line: number;
  column: number;
  severity: Severity;
  message: string;
  code?: string;
}

export function parseProblems(output: string, matcher: "tsc" | "gcc"): Problem[] {
  throw new Error("not implemented");
}

// what a ProblemMatcher finds
export interface MatchedProblem {
  path: string;
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
  severity: Severity;
  message: string;
  code?: string;
  owner: string;
  source?: string;
}

// one pattern: the numbers are regexp groups
export interface ProblemPattern {
  regexp: string;
  file?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  // "10", "10,5" or "10,5,10,8"
  location?: number;
  severity?: number;
  message?: number;
  code?: number;
  // the last pattern of a multi-line one repeats while it matches
  loop?: boolean;
}

export type FileLocation =
  | "absolute"
  | "relative"
  | "autoDetect"
  | ["relative", string]
  | ["search", { include: string[] }];

// the "problemMatcher" of tasks.json
export interface ProblemMatcherDefinition {
  owner: string;
  source?: string;
  // for lines without one
  severity?: Severity;
  fileLocation: FileLocation;
  pattern: ProblemPattern | ProblemPattern[];
  background?: {
    activeOnStart: boolean;
    beginsPattern: string;
    endsPattern: string;
  };
}

export interface ProblemMatcherOptions {
  workspaceFolder: string;
  exists?(path: string): boolean;
  // fileLocation "search": the file named name somewhere under folder
  find?(folder: string, name: string): string | undefined;
}

export class ProblemMatcher {
  // a ProblemMatcherDefinition, as read from tasks.json
  constructor(definition: object, options: ProblemMatcherOptions) {}

  processLine(line: string): void {
    throw new Error("not implemented");
  }

  problems(): MatchedProblem[] {
    throw new Error("not implemented");
  }

  // background matchers: between beginsPattern and endsPattern
  isActive(): boolean {
    throw new Error("not implemented");
  }
}

// "$tsc", "$tsc-watch", "$eslint-compact", "$eslint-stylish", "$go",
// "$jshint", "$mscompile", "$lessc", "$node-sass"
export function builtInMatcher(name: string, options: ProblemMatcherOptions): ProblemMatcher {
  throw new Error("not implemented");
}
