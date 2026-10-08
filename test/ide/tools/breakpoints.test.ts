import { describe, expect, it } from "vitest";
import { BreakpointStore } from "../../../src/Debug/breakpoints.js";

// Proposed module src/Debug/breakpoints.ts, the first piece of a debugger.
// Talking to a debug adapter (DAP) uses the same framing as language
// servers (see language/jsonrpc.test.ts).
//
//   store.toggle(path, line) -> true when it is now set
//   store.has(path, line) / store.list(path) (sorted by line)
//   store.setCondition(path, line, expression)
//   store.linesChanged(path, startLine, removed, added)
//     keeps breakpoints on their code when lines are edited: lines below
//     the change move, a breakpoint on a removed line goes away
//   store.toDap(path) -> [{ line (1-based), condition? }] for setBreakpoints

describe("BreakpointStore", () => {
  it("toggle sets and then clears a breakpoint", () => {
    const store = new BreakpointStore();

    expect(store.toggle("a.ts", 4)).eq(true);
    expect(store.has("a.ts", 4)).eq(true);
    expect(store.toggle("a.ts", 4)).eq(false);
    expect(store.has("a.ts", 4)).eq(false);
  });

  it("lists a file's breakpoints by line", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 9);
    store.toggle("a.ts", 2);
    store.toggle("b.ts", 5);

    expect(store.list("a.ts").map((b) => b.line)).toEqual([2, 9]);
  });

  it("keeps a condition", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 2);
    store.setCondition("a.ts", 2, "i > 3");

    expect(store.list("a.ts")[0].condition).eq("i > 3");
  });

  it("moves breakpoints down when lines are added above them", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 5);

    store.linesChanged("a.ts", 1, 0, 2);

    expect(store.list("a.ts").map((b) => b.line)).toEqual([7]);
  });

  it("moves breakpoints up when lines above them are removed", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 5);

    store.linesChanged("a.ts", 1, 2, 0);

    expect(store.list("a.ts").map((b) => b.line)).toEqual([3]);
  });

  it("drops a breakpoint whose line was removed", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 5);

    store.linesChanged("a.ts", 4, 3, 0);

    expect(store.list("a.ts")).toEqual([]);
  });

  it("leaves breakpoints above the change alone", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 1);

    store.linesChanged("a.ts", 3, 0, 5);

    expect(store.list("a.ts").map((b) => b.line)).toEqual([1]);
  });

  it("converts to DAP's 1-based lines", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 0);
    store.toggle("a.ts", 4);
    store.setCondition("a.ts", 4, "x");

    expect(store.toDap("a.ts")).toEqual([{ line: 1 }, { line: 5, condition: "x" }]);
  });
});
