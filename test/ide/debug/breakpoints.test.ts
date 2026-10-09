import { describe, expect, it } from "vitest";
import { BreakpointStore } from "../../../src/Debug/breakpoints.js";
import { formatLogMessage, shouldBreakOnHit } from "../../../src/Debug/breakpointConditions.js";

// Breakpoint kinds beyond the basics in test/ide/tools/breakpoints.test.ts.
// More on BreakpointStore (src/Debug/breakpoints.ts):
//   toggle(path, line, { column? })          inline breakpoint at a column
//   setLogMessage(path, line, message)       a logpoint: logs, doesn't stop
//   setHitCondition(path, line, condition)
//   setTriggeredBy(path, line, otherBreakpointId)  only active after that one is hit
//   setEnabled(path, line, enabled) / setAllEnabled(enabled)
//   addFunctionBreakpoint(name, { condition? }) / functionBreakpoints()
//   setExceptionFilters(filters from the adapter) / enableExceptionFilter(id, on)
//     filters marked default: true start enabled
//   update(path, adapterResults) -> sets verified / moves the line the
//     adapter reports
//   toDap(path) -> what setBreakpoints sends: disabled ones and triggered
//     ones that aren't active yet are left out; lines and columns 1-based
//   hit(id) -> marks a breakpoint hit (activates the ones it triggers)
// Proposed src/Debug/breakpointConditions.ts:
//   formatLogMessage(template, evaluate) -> Promise of the message with
//     each {expression} replaced; \{ is a literal brace
//   shouldBreakOnHit(condition, hitCount): ">5", ">=5", "==5", "5" (same as
//     ==), "%3" (every third hit)

describe("logpoints", () => {
  it("interpolates expressions in braces", async () => {
    const values: Record<string, string> = { "user.id": "42", "items.length": "3" };

    await expect(
      formatLogMessage("User {user.id} has {items.length} items", async (e: string) => values[e]),
    ).resolves.eq("User 42 has 3 items");
  });

  it("keeps escaped braces", async () => {
    await expect(formatLogMessage("set \\{a\\} = {a}", async () => "1")).resolves.eq("set {a} = 1");
  });

  it("a logpoint is sent as a log message", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 4);
    store.setLogMessage("a.ts", 4, "x is {x}");

    expect(store.toDap("a.ts")).toEqual([{ line: 5, logMessage: "x is {x}" }]);
  });
});

describe("hit conditions", () => {
  it.each([
    [">5", 5, false],
    [">5", 6, true],
    [">=5", 5, true],
    ["==5", 5, true],
    ["5", 5, true],
    ["5", 6, false],
    ["%3", 3, true],
    ["%3", 4, false],
  ])("%s at hit %i is %s", (condition, count, expected) => {
    expect(shouldBreakOnHit(condition, count)).eq(expected);
  });

  it("is sent to the adapter", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 0);
    store.setHitCondition("a.ts", 0, ">5");

    expect(store.toDap("a.ts")).toEqual([{ line: 1, hitCondition: ">5" }]);
  });
});

describe("inline breakpoints", () => {
  it("send their column", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 2, { column: 10 });

    expect(store.toDap("a.ts")).toEqual([{ line: 3, column: 11 }]);
  });

  it("several on one line are separate", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 2, { column: 1 });
    store.toggle("a.ts", 2, { column: 8 });

    expect(store.toDap("a.ts")).toHaveLength(2);
  });
});

describe("enabling", () => {
  it("disabled breakpoints are not sent", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 1);
    store.toggle("a.ts", 2);

    store.setEnabled("a.ts", 1, false);

    expect(store.toDap("a.ts")).toEqual([{ line: 3 }]);
  });

  it("setAllEnabled switches every breakpoint", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 1);
    store.toggle("b.ts", 1);

    store.setAllEnabled(false);

    expect([...store.toDap("a.ts"), ...store.toDap("b.ts")]).toEqual([]);
  });
});

describe("triggered breakpoints", () => {
  it("are not sent until the trigger is hit", () => {
    const store = new BreakpointStore();
    const trigger = store.toggle("a.ts", 1) && store.list("a.ts")[0].id;
    store.toggle("a.ts", 9);
    store.setTriggeredBy("a.ts", 9, trigger);

    expect(store.toDap("a.ts")).toEqual([{ line: 2 }]);

    store.hit(trigger);
    expect(store.toDap("a.ts")).toEqual([{ line: 2 }, { line: 10 }]);
  });
});

describe("function and exception breakpoints", () => {
  it("function breakpoints by name", () => {
    const store = new BreakpointStore();
    store.addFunctionBreakpoint("main", { condition: "argc > 1" });

    expect(store.functionBreakpoints()).toEqual([{ name: "main", condition: "argc > 1" }]);
  });

  it("exception filters start as the adapter says", () => {
    const store = new BreakpointStore();
    store.setExceptionFilters([
      { filter: "uncaught", label: "Uncaught Exceptions", default: true },
      { filter: "all", label: "All Exceptions" },
    ]);

    expect(store.enabledExceptionFilters()).toEqual(["uncaught"]);

    store.enableExceptionFilter("all", true);
    expect(store.enabledExceptionFilters()).toEqual(["uncaught", "all"]);
  });
});

describe("what the adapter says back", () => {
  it("marks breakpoints verified and moves them where the adapter put them", () => {
    const store = new BreakpointStore();
    store.toggle("a.ts", 4);
    store.toggle("a.ts", 20);

    store.update("a.ts", [
      { verified: true, line: 7 },
      { verified: false, message: "No code here" },
    ]);

    expect(store.list("a.ts")).toEqual([
      expect.objectContaining({ line: 6, verified: true }),
      expect.objectContaining({ line: 20, verified: false, message: "No code here" }),
    ]);
  });
});
