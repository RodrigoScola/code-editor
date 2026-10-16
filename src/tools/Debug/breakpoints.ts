// A file's breakpoints. Lines and columns are 0-based here; toDap() turns
// them into the 1-based ones the debug adapter (DAP) wants.

export interface Breakpoint {
  id: number;
  path: string;
  line: number;
  // an inline breakpoint; a line breakpoint has none
  column?: number;
  enabled: boolean;
  // what the adapter said back (update())
  verified?: boolean;
  message?: string;
  condition?: string;
  hitCondition?: string;
  // a logpoint: logs this instead of stopping
  logMessage?: string;
  // only active after this breakpoint is hit
  triggeredBy?: number;
}

// one breakpoint as setBreakpoints sends it (DAP SourceBreakpoint), 1-based
export interface DapBreakpoint {
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

// what the adapter answers setBreakpoints with, one per breakpoint sent
export interface AdapterBreakpoint {
  verified: boolean;
  line?: number;
  column?: number;
  message?: string;
}

export interface FunctionBreakpoint {
  name: string;
  condition?: string;
}

// from the adapter's capabilities (exceptionBreakpointFilters)
export interface ExceptionFilter {
  filter: string;
  label: string;
  default?: boolean;
}

export class BreakpointStore {
  // true when it is now set
  toggle(path: string, line: number, options: { column?: number } = {}): boolean {
    throw new Error("not implemented");
  }

  has(path: string, line: number): boolean {
    throw new Error("not implemented");
  }

  // sorted by line
  list(path: string): Breakpoint[] {
    throw new Error("not implemented");
  }

  // the files that have breakpoints
  files(): string[] {
    throw new Error("not implemented");
  }

  setCondition(path: string, line: number, condition: string): void {
    throw new Error("not implemented");
  }

  setLogMessage(path: string, line: number, message: string): void {
    throw new Error("not implemented");
  }

  setHitCondition(path: string, line: number, condition: string): void {
    throw new Error("not implemented");
  }

  setTriggeredBy(path: string, line: number, breakpointId: number): void {
    throw new Error("not implemented");
  }

  setEnabled(path: string, line: number, enabled: boolean): void {
    throw new Error("not implemented");
  }

  setAllEnabled(enabled: boolean): void {
    throw new Error("not implemented");
  }

  addFunctionBreakpoint(name: string, options: { condition?: string } = {}): void {
    throw new Error("not implemented");
  }

  functionBreakpoints(): FunctionBreakpoint[] {
    throw new Error("not implemented");
  }

  // filters marked default: true start enabled
  setExceptionFilters(filters: ExceptionFilter[]): void {
    throw new Error("not implemented");
  }

  enableExceptionFilter(filter: string, enabled: boolean): void {
    throw new Error("not implemented");
  }

  enabledExceptionFilters(): string[] {
    throw new Error("not implemented");
  }

  // sets verified, and moves breakpoints to the line the adapter reports
  update(path: string, results: AdapterBreakpoint[]): void {
    throw new Error("not implemented");
  }

  // disabled ones and triggered ones that aren't active yet are left out
  toDap(path: string): DapBreakpoint[] {
    throw new Error("not implemented");
  }

  // activates the breakpoints this one triggers
  hit(id: number): void {
    throw new Error("not implemented");
  }

  // lines below the change move; a breakpoint on a removed line goes away
  linesChanged(path: string, startLine: number, removed: number, added: number): void {
    throw new Error("not implemented");
  }
}
