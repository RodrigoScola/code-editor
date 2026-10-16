// A debug session talking the Debug Adapter Protocol
import type { AdapterBreakpoint, DapBreakpoint } from "./breakpoints.js";
import type { LaunchConfiguration } from "./launchConfig.js";

export interface DapRequest {
  command: string;
  arguments?: Record<string, unknown>;
}

export interface DebugAdapter {
  // resolves with the response body
  send(request: DapRequest): Promise<unknown>;
  on(event: string, handler: (body: unknown) => void): void;
  // reverse requests from the adapter, like runInTerminal
  onRequest?(command: string, handler: (args: unknown) => Promise<unknown>): void;
}

// the part of BreakpointStore a session needs
export interface SessionBreakpoints {
  files(): string[];
  toDap(path: string): DapBreakpoint[];
  enabledExceptionFilters(): string[];
  update(path: string, results: AdapterBreakpoint[]): void;
}

export interface OutputEvent {
  category?: string;
  output: string;
}

export interface RunInTerminalArgs {
  args: string[];
  cwd: string;
  env?: Record<string, string | null>;
  kind?: "integrated" | "external";
  title?: string;
}

export interface DebugSessionOptions {
  breakpoints: SessionBreakpoints;
  onOutput?: (output: OutputEvent) => void;
  // resolves with the process id
  runInTerminal?: (args: RunInTerminalArgs) => Promise<number>;
}

export type SessionState = "inactive" | "initializing" | "running" | "stopped";

export type DebugAction =
  | "continue"
  | "next"
  | "stepIn"
  | "stepOut"
  | "stepBack"
  | "reverseContinue"
  | "pause"
  | "restart"
  | "stop";

export interface Thread {
  id: number;
  name: string;
}

export interface StackFrame {
  id: number;
  name: string;
  line: number;
  column: number;
  source?: { path?: string; name?: string };
  presentationHint?: string;
}

export interface EvaluateResult {
  result: string;
  type?: string;
  variablesReference: number;
}

export interface StepInTarget {
  id: number;
  label: string;
}

export class DebugSession {
  constructor(adapter: DebugAdapter, options: DebugSessionOptions) {}

  // initialize -> launch/attach; on "initialized": setBreakpoints per file,
  // setExceptionBreakpoints, configurationDone
  start(config: LaunchConfiguration): Promise<void> {
    throw new Error("not implemented");
  }

  state(): SessionState {
    throw new Error("not implemented");
  }

  threads(): Thread[] {
    throw new Error("not implemented");
  }

  stack(threadId: number): StackFrame[] {
    throw new Error("not implemented");
  }

  focusedFrame(): StackFrame | undefined {
    throw new Error("not implemented");
  }

  // the toolbar's enabled actions for the state
  actions(): DebugAction[] {
    throw new Error("not implemented");
  }

  continue(): Promise<void> {
    throw new Error("not implemented");
  }

  next(): Promise<void> {
    throw new Error("not implemented");
  }

  stepIn(options: { targetId?: number } = {}): Promise<void> {
    throw new Error("not implemented");
  }

  stepOut(): Promise<void> {
    throw new Error("not implemented");
  }

  pause(): Promise<void> {
    throw new Error("not implemented");
  }

  // needs supportsStepBack
  stepBack(): Promise<void> {
    throw new Error("not implemented");
  }

  reverseContinue(): Promise<void> {
    throw new Error("not implemented");
  }

  // restart request if supported, else terminate and start again
  restart(): Promise<void> {
    throw new Error("not implemented");
  }

  // terminate if supported, then disconnect
  stop(): Promise<void> {
    throw new Error("not implemented");
  }

  // in the focused frame, context "repl"
  evaluate(expression: string): Promise<EvaluateResult> {
    throw new Error("not implemented");
  }

  setVariable(variablesReference: number, name: string, value: string): Promise<void> {
    throw new Error("not implemented");
  }

  // a breakpoint that lives until the next stop, then continue
  runToCursor(path: string, line: number): Promise<void> {
    throw new Error("not implemented");
  }

  // gotoTargets, then goto the first; needs supportsGotoTargetsRequest
  jumpToCursor(path: string, line: number): Promise<void> {
    throw new Error("not implemented");
  }

  // needs supportsRestartFrame
  restartFrame(frameId: number): Promise<void> {
    throw new Error("not implemented");
  }

  // needs supportsStepInTargetsRequest
  stepInTargets(frameId: number): Promise<StepInTarget[]> {
    throw new Error("not implemented");
  }
}
