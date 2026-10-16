// The Run and Debug views

export interface CallStackFrame {
  id: number;
  name: string;
  presentationHint?: string;
}

// runs of "deemphasize" frames collapse into one row; loadMore when there
// are more frames than were loaded
export type CallStackRow<F extends CallStackFrame = CallStackFrame> =
  | F
  | { collapsed: number }
  | { loadMore: true };

export class CallStackView<F extends CallStackFrame = CallStackFrame> {
  constructor(frames: F[], totalFrames: number) {}

  rows(): CallStackRow<F>[] {
    throw new Error("not implemented");
  }
}

export interface Variable {
  name: string;
  value: string;
  variablesReference: number;
  type?: string;
  evaluateName?: string;
  indexedVariables?: number;
  namedVariables?: number;
}

export interface VariablesFetchOptions {
  filter?: "indexed" | "named";
  start?: number;
  count?: number;
}

// a variable, or a "[100..199]" slice of a big array
export interface VariableNode extends Variable {
  range?: { start: number; count: number };
}

export type FetchVariables = (
  variablesReference: number,
  options?: VariablesFetchOptions,
) => Promise<Variable[]>;

export class VariablesTree {
  constructor(fetch: FetchVariables) {}

  // children are fetched once; more than 100 indexed variables come back
  // as ranges
  expand(
    variablesReference: number,
    options: { indexedVariables?: number } = {},
  ): Promise<VariableNode[]> {
    throw new Error("not implemented");
  }

  // fetches just that range's slice
  expandRange(range: VariableNode): Promise<VariableNode[]> {
    throw new Error("not implemented");
  }
}

export interface WatchResult {
  expression: string;
  value?: string;
  error?: string;
}

export class WatchList {
  constructor(evaluate: (expression: string) => Promise<string>) {}

  add(expression: string): void {
    throw new Error("not implemented");
  }

  remove(index: number): void {
    throw new Error("not implemented");
  }

  edit(index: number, expression: string): void {
    throw new Error("not implemented");
  }

  expressions(): string[] {
    throw new Error("not implemented");
  }

  refresh(): Promise<WatchResult[]> {
    throw new Error("not implemented");
  }
}

// the debug console's input history
export class ReplHistory {
  add(input: string): void {
    throw new Error("not implemented");
  }

  previous(): string {
    throw new Error("not implemented");
  }

  // "" past the newest
  next(): string {
    throw new Error("not implemented");
  }
}

export interface InlineValue {
  line: number;
  // "x = 1, y = 2"
  text: string;
}

// lines in the scope, up to the stop line, that mention a variable by name
export function inlineValues(
  lines: string[],
  scope: { startLine: number; endLine: number },
  stopLine: number,
  variables: { name: string; value: string }[],
): InlineValue[] {
  throw new Error("not implemented");
}

// the expression under the cursor for the debug hover: "a.b.c", "this.x",
// "list[0].name"; undefined off a name
export function expressionAt(line: string, column: number): string | undefined {
  throw new Error("not implemented");
}
