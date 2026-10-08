import { describe, expect, it } from "vitest";
import { DebugSession } from "../../../src/Debug/session.js";

// A debug session talking the Debug Adapter Protocol. Proposed
// src/Debug/session.ts:
//   new DebugSession(adapter, { breakpoints, onOutput?, runInTerminal? })
//     adapter: { send(request) -> Promise<response body>, on(event, handler) }
//       (a fake one here; for real adapters it sits on top of jsonrpc-style
//       framing, see test/ide/language/jsonrpc.test.ts)
//   session.start(config)    initialize -> launch/attach; on the
//     "initialized" event: setBreakpoints for each file with breakpoints,
//     setExceptionBreakpoints, then configurationDone
//   session.state() -> "inactive" | "initializing" | "running" | "stopped"
//   session.threads() / session.stack(threadId) / session.focusedFrame()
//   session.continue() / next() / stepIn() / stepOut() / pause()
//   session.restart()   restart request if supportsRestartRequest, else
//                       terminate and start again
//   session.stop()      terminate if supportsTerminateRequest, then
//                       disconnect; otherwise just disconnect
//   session.evaluate(expression) in the focused frame, context "repl"
//   session.setVariable(variablesReference, name, value)
//   output events go to onOutput({ category, output })
//   the "runInTerminal" reverse request calls runInTerminal(args) and
//   answers with the process id it returns

function fakeAdapter(capabilities: Record<string, boolean> = {}) {
  const sent: { command: string; arguments?: Record<string, unknown> }[] = [];
  const handlers: Record<string, (body: unknown) => void> = {};
  const reverse: Record<string, (args: unknown) => Promise<unknown>> = {};
  const adapter = {
    sent,
    async send(request: { command: string; arguments?: Record<string, unknown> }) {
      sent.push(request);
      switch (request.command) {
        case "initialize":
          return capabilities;
        case "launch":
          setTimeout(() => handlers.initialized?.({}), 0);
          return {};
        case "threads":
          return { threads: [{ id: 1, name: "main" }] };
        case "stackTrace":
          return { stackFrames: [{ id: 10, name: "f", line: 3, column: 1, source: { path: "a.ts" } }], totalFrames: 1 };
        case "evaluate":
          return { result: `value of ${request.arguments?.expression}`, variablesReference: 0 };
        case "setBreakpoints":
          return { breakpoints: (request.arguments?.breakpoints as unknown[]).map(() => ({ verified: true })) };
        default:
          return {};
      }
    },
    on(event: string, handler: (body: unknown) => void) {
      handlers[event] = handler;
    },
    onRequest(command: string, handler: (args: unknown) => Promise<unknown>) {
      reverse[command] = handler;
    },
    emit(event: string, body: unknown) {
      handlers[event]?.(body);
    },
    request(command: string, args: unknown) {
      return reverse[command](args);
    },
  };
  return adapter;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const commands = (adapter: ReturnType<typeof fakeAdapter>) => adapter.sent.map((r) => r.command);

function breakpoints() {
  return {
    files: () => ["a.ts", "b.ts"],
    toDap: (path: string) => (path === "a.ts" ? [{ line: 3 }] : [{ line: 7 }]),
    enabledExceptionFilters: () => ["uncaught"],
    update: () => {},
  };
}

describe("starting", () => {
  it("initializes, launches, sends breakpoints and finishes configuration", async () => {
    const adapter = fakeAdapter();
    const session = new DebugSession(adapter, { breakpoints: breakpoints() });

    await session.start({ type: "node", request: "launch", name: "Run" });
    await tick();

    expect(commands(adapter)).toEqual([
      "initialize",
      "launch",
      "setBreakpoints",
      "setBreakpoints",
      "setExceptionBreakpoints",
      "configurationDone",
    ]);
  });

  it("sends each file's breakpoints", async () => {
    const adapter = fakeAdapter();
    const session = new DebugSession(adapter, { breakpoints: breakpoints() });

    await session.start({ type: "node", request: "launch", name: "Run" });
    await tick();

    const sets = adapter.sent.filter((r) => r.command === "setBreakpoints");
    expect(sets.map((r) => r.arguments)).toEqual([
      { source: { path: "a.ts" }, breakpoints: [{ line: 3 }] },
      { source: { path: "b.ts" }, breakpoints: [{ line: 7 }] },
    ]);
  });

  it("attach configurations send attach", async () => {
    const adapter = fakeAdapter();
    await new DebugSession(adapter, { breakpoints: breakpoints() }).start({ type: "node", request: "attach", name: "A" });

    expect(commands(adapter)).toContain("attach");
  });
});

describe("stopping and stepping", () => {
  async function stopped() {
    const adapter = fakeAdapter();
    const session = new DebugSession(adapter, { breakpoints: breakpoints() });
    await session.start({ type: "node", request: "launch", name: "Run" });
    await tick();
    adapter.emit("stopped", { reason: "breakpoint", threadId: 1 });
    await tick();
    return { adapter, session };
  }

  it("a stopped event loads threads and the stack", async () => {
    const { adapter, session } = await stopped();

    expect(session.state()).eq("stopped");
    expect(commands(adapter)).toEqual(expect.arrayContaining(["threads", "stackTrace"]));
    expect(session.focusedFrame()).toMatchObject({ id: 10, name: "f", line: 3 });
  });

  it("continue, next, stepIn and stepOut send the thread", async () => {
    const { adapter, session } = await stopped();

    await session.next();
    await session.stepIn();
    await session.stepOut();
    await session.continue();

    const steps = adapter.sent.filter((r) => ["next", "stepIn", "stepOut", "continue"].includes(r.command));
    expect(steps.map((r) => [r.command, r.arguments?.threadId])).toEqual([
      ["next", 1],
      ["stepIn", 1],
      ["stepOut", 1],
      ["continue", 1],
    ]);
    expect(session.state()).eq("running");
  });

  it("evaluate runs in the focused frame", async () => {
    const { adapter, session } = await stopped();

    await expect(session.evaluate("x + 1")).resolves.toMatchObject({ result: "value of x + 1" });
    expect(adapter.sent.at(-1)?.arguments).toMatchObject({ expression: "x + 1", frameId: 10, context: "repl" });
  });

  it("setVariable sends the new value", async () => {
    const { adapter, session } = await stopped();

    await session.setVariable(5, "x", "42");

    expect(adapter.sent.at(-1)).toEqual({
      command: "setVariable",
      arguments: { variablesReference: 5, name: "x", value: "42" },
    });
  });
});

describe("restarting and stopping", () => {
  it("restart uses the restart request when the adapter supports it", async () => {
    const adapter = fakeAdapter({ supportsRestartRequest: true });
    const session = new DebugSession(adapter, { breakpoints: breakpoints() });
    await session.start({ type: "node", request: "launch", name: "Run" });

    await session.restart();

    expect(commands(adapter)).toContain("restart");
  });

  it("otherwise restart terminates and launches again", async () => {
    const adapter = fakeAdapter();
    const session = new DebugSession(adapter, { breakpoints: breakpoints() });
    await session.start({ type: "node", request: "launch", name: "Run" });

    await session.restart();

    expect(commands(adapter).filter((c) => c === "launch")).toHaveLength(2);
  });

  it("stop terminates first when supported", async () => {
    const adapter = fakeAdapter({ supportsTerminateRequest: true });
    const session = new DebugSession(adapter, { breakpoints: breakpoints() });
    await session.start({ type: "node", request: "launch", name: "Run" });

    await session.stop();

    expect(commands(adapter).slice(-2)).toEqual(["terminate", "disconnect"]);
  });

  it("the terminated event ends the session", async () => {
    const adapter = fakeAdapter();
    const session = new DebugSession(adapter, { breakpoints: breakpoints() });
    await session.start({ type: "node", request: "launch", name: "Run" });

    adapter.emit("terminated", {});

    expect(session.state()).eq("inactive");
  });
});

describe("output and reverse requests", () => {
  it("output events go to the debug console", async () => {
    const adapter = fakeAdapter();
    const output: unknown[] = [];
    const session = new DebugSession(adapter, { breakpoints: breakpoints(), onOutput: (o: unknown) => output.push(o) });
    await session.start({ type: "node", request: "launch", name: "Run" });

    adapter.emit("output", { category: "stdout", output: "hello\n" });

    expect(output).toEqual([{ category: "stdout", output: "hello\n" }]);
  });

  it("runInTerminal starts the program and answers with its process id", async () => {
    const adapter = fakeAdapter();
    const session = new DebugSession(adapter, {
      breakpoints: breakpoints(),
      runInTerminal: async () => 1234,
    });
    await session.start({ type: "node", request: "launch", name: "Run" });

    await expect(adapter.request("runInTerminal", { args: ["node", "a.js"], cwd: "/p" })).resolves.toEqual({
      processId: 1234,
    });
  });
});
