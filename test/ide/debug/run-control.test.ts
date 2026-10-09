import { describe, expect, it } from "vitest";
import { DebugSession } from "../../../src/Debug/session.js";

// More ways to control a paused program (VS Code: Run to Cursor, Jump to
// Cursor, Restart Frame, Step Into Target, step back). Extends the
// DebugSession from test/ide/debug/session.test.ts:
//
//   session.runToCursor(path, line)   adds a breakpoint that only lives
//     until the next stop (setBreakpoints with the file's breakpoints plus
//     that line), continues, and on the next stop, whatever the reason,
//     sends the file's breakpoints again without it
//   session.jumpToCursor(path, line)  moves the instruction pointer without
//     running code: gotoTargets, then goto with the first target. Needs
//     supportsGotoTargetsRequest; without it, throws "not supported"
//   session.restartFrame(frameId)     needs supportsRestartFrame
//   session.stepInTargets(frameId) -> [{ id, label }] (needs
//     supportsStepInTargetsRequest); session.stepIn({ targetId }) steps into
//     that one
//   session.stepBack() / reverseContinue()   need supportsStepBack
//   session.actions() -> the toolbar's enabled actions for the state:
//     running: pause, restart, stop
//     stopped: continue, next, stepIn, stepOut, restart, stop, plus
//       stepBack and reverseContinue when supported

type Request = { command: string; arguments?: Record<string, unknown> };

function fakeAdapter(capabilities: Record<string, boolean> = {}) {
  const sent: Request[] = [];
  const handlers: Record<string, (body: unknown) => void> = {};
  return {
    sent,
    async send(request: Request) {
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
        case "setBreakpoints":
          return { breakpoints: (request.arguments?.breakpoints as unknown[]).map(() => ({ verified: true })) };
        case "gotoTargets":
          return { targets: [{ id: 77, label: "line 9", line: request.arguments?.line }] };
        case "stepInTargets":
          return { targets: [{ id: 1, label: "g()" }, { id: 2, label: "h()" }] };
        default:
          return {};
      }
    },
    on(event: string, handler: (body: unknown) => void) {
      handlers[event] = handler;
    },
    onRequest() {},
    emit(event: string, body: unknown) {
      handlers[event]?.(body);
    },
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

function breakpoints() {
  return {
    files: () => ["a.ts"],
    toDap: (path: string) => (path === "a.ts" ? [{ line: 3 }] : []),
    enabledExceptionFilters: () => [],
    update: () => {},
  };
}

// a session stopped at a breakpoint, with the requests so far cleared
async function stopped(capabilities: Record<string, boolean> = {}) {
  const adapter = fakeAdapter(capabilities);
  const session = new DebugSession(adapter, { breakpoints: breakpoints() });
  await session.start({ type: "node", request: "launch", name: "Run" });
  await tick();
  adapter.emit("stopped", { reason: "breakpoint", threadId: 1 });
  await tick();
  adapter.sent.length = 0;
  return { adapter, session };
}

const after = (adapter: ReturnType<typeof fakeAdapter>, command: string) =>
  adapter.sent.filter((r) => r.command === command).map((r) => r.arguments);

describe("run to cursor", () => {
  it("adds a breakpoint for the line and continues", async () => {
    const { adapter, session } = await stopped();

    await session.runToCursor("a.ts", 9);

    expect(after(adapter, "setBreakpoints")).toEqual([
      { source: { path: "a.ts" }, breakpoints: [{ line: 3 }, { line: 9 }] },
    ]);
    expect(adapter.sent.map((r) => r.command)).toContain("continue");
  });

  it("removes that breakpoint on the next stop", async () => {
    const { adapter, session } = await stopped();
    await session.runToCursor("a.ts", 9);

    adapter.emit("stopped", { reason: "breakpoint", threadId: 1 });
    await tick();

    expect(after(adapter, "setBreakpoints").at(-1)).toEqual({
      source: { path: "a.ts" },
      breakpoints: [{ line: 3 }],
    });
  });

  it("removes it even when the program stopped somewhere else first", async () => {
    const { adapter, session } = await stopped();
    await session.runToCursor("a.ts", 9);

    adapter.emit("stopped", { reason: "exception", threadId: 1 });
    await tick();

    expect(after(adapter, "setBreakpoints").at(-1)).toEqual({
      source: { path: "a.ts" },
      breakpoints: [{ line: 3 }],
    });
  });

  it("works in a file that has no breakpoints", async () => {
    const { adapter, session } = await stopped();

    await session.runToCursor("b.ts", 4);

    expect(after(adapter, "setBreakpoints")).toEqual([
      { source: { path: "b.ts" }, breakpoints: [{ line: 4 }] },
    ]);
  });
});

describe("jump to cursor", () => {
  it("asks for the targets on that line and jumps to the first", async () => {
    const { adapter, session } = await stopped({ supportsGotoTargetsRequest: true });

    await session.jumpToCursor("a.ts", 9);

    expect(after(adapter, "gotoTargets")).toEqual([{ source: { path: "a.ts" }, line: 9 }]);
    expect(after(adapter, "goto")).toEqual([{ threadId: 1, targetId: 77 }]);
  });

  it("does not continue the program", async () => {
    const { adapter, session } = await stopped({ supportsGotoTargetsRequest: true });

    await session.jumpToCursor("a.ts", 9);

    expect(adapter.sent.map((r) => r.command)).not.toContain("continue");
  });

  it("is refused when the debugger can't do it", async () => {
    const { session } = await stopped();

    await expect(session.jumpToCursor("a.ts", 9)).rejects.toThrow(/not supported/);
  });
});

describe("restart frame and step into target", () => {
  it("restartFrame sends the frame", async () => {
    const { adapter, session } = await stopped({ supportsRestartFrame: true });

    await session.restartFrame(10);

    expect(after(adapter, "restartFrame")).toEqual([{ frameId: 10 }]);
  });

  it("restartFrame is refused without support", async () => {
    const { session } = await stopped();

    await expect(session.restartFrame(10)).rejects.toThrow(/not supported/);
  });

  it("lists the calls on the line to step into", async () => {
    const { session } = await stopped({ supportsStepInTargetsRequest: true });

    expect(await session.stepInTargets(10)).toEqual([
      { id: 1, label: "g()" },
      { id: 2, label: "h()" },
    ]);
  });

  it("steps into the chosen one", async () => {
    const { adapter, session } = await stopped({ supportsStepInTargetsRequest: true });

    await session.stepIn({ targetId: 2 });

    expect(after(adapter, "stepIn")).toEqual([{ threadId: 1, targetId: 2 }]);
  });
});

describe("the toolbar", () => {
  it("while stopped", async () => {
    const { session } = await stopped();

    expect(session.actions().sort()).toEqual(["continue", "next", "restart", "stepIn", "stepOut", "stop"]);
  });

  it("while running", async () => {
    const { adapter, session } = await stopped();
    adapter.emit("continued", { threadId: 1, allThreadsContinued: true });
    await tick();

    expect(session.actions().sort()).toEqual(["pause", "restart", "stop"]);
  });

  it("adds stepping back when the debugger supports it", async () => {
    const { session } = await stopped({ supportsStepBack: true });

    expect(session.actions()).toContain("stepBack");
    expect(session.actions()).toContain("reverseContinue");
  });

  it("stepBack sends the request for the stopped thread", async () => {
    const { adapter, session } = await stopped({ supportsStepBack: true });

    await session.stepBack();

    expect(after(adapter, "stepBack")).toEqual([{ threadId: 1 }]);
  });

  it("has nothing once the session has ended", async () => {
    const { adapter, session } = await stopped();
    adapter.emit("terminated", {});
    await tick();

    expect(session.actions()).toEqual([]);
  });
});
