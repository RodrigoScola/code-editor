import { describe, expect, it } from "vitest";
import {
  CallStackView,
  ReplHistory,
  VariablesTree,
  WatchList,
  expressionAt,
  inlineValues,
} from "../../../src/Debug/views.js";

// The Run and Debug views. Proposed src/Debug/views.ts:
//   new CallStackView(frames, totalFrames)
//     rows() -> frames, with runs of presentationHint "deemphasize" frames
//     collapsed into one { collapsed: n } row, and a { loadMore: true } row
//     when totalFrames is more than the frames loaded
//   new VariablesTree(fetch(variablesReference, { start?, count? }) -> Promise)
//     expand(ref) -> children, fetched only once; an array with more than
//     100 indexed variables shows ranges "[0..99]", "[100..199]" instead
//   new WatchList(evaluate)  add / remove / edit / expressions();
//     refresh() -> [{ expression, value | error }]
//   new ReplHistory()  add(input), previous(), next()
//   inlineValues(lines, scope: { startLine, endLine }, stopLine, variables)
//     -> [{ line, text: "x = 1, y = 2" }] for lines in the function up to
//        the stop line that mention a variable by name
//   expressionAt(line, column) -> the expression under the mouse/cursor for
//     the debug hover ("a.b.c", "this.x", "list[0].name")

describe("call stack", () => {
  const frame = (id: number, name: string, hint?: string) => ({ id, name, presentationHint: hint });

  it("collapses runs of de-emphasized frames", () => {
    const view = new CallStackView(
      [frame(1, "main"), frame(2, "internal1", "deemphasize"), frame(3, "internal2", "deemphasize"), frame(4, "run")],
      4,
    );

    expect(view.rows()).toEqual([
      expect.objectContaining({ name: "main" }),
      { collapsed: 2 },
      expect.objectContaining({ name: "run" }),
    ]);
  });

  it("offers to load more frames", () => {
    expect(new CallStackView([frame(1, "a")], 50).rows().at(-1)).toEqual({ loadMore: true });
  });
});

describe("variables", () => {
  it("fetches children once", async () => {
    let fetches = 0;
    const tree = new VariablesTree(async () => {
      fetches++;
      return [{ name: "x", value: "1", variablesReference: 0 }];
    });

    await tree.expand(7);
    await tree.expand(7);

    expect(fetches).eq(1);
  });

  it("splits big arrays into ranges of 100", async () => {
    const tree = new VariablesTree(async () => []);

    const children = await tree.expand(9, { indexedVariables: 250 });

    expect(children.map((c: { name: string }) => c.name)).toEqual(["[0..99]", "[100..199]", "[200..249]"]);
  });

  it("expanding a range fetches just that slice", async () => {
    const asked: unknown[] = [];
    const tree = new VariablesTree(async (_ref: number, options: unknown) => {
      asked.push(options);
      return [];
    });

    const [, second] = await tree.expand(9, { indexedVariables: 250 });
    await tree.expandRange(second);

    expect(asked).toEqual([{ filter: "indexed", start: 100, count: 100 }]);
  });
});

describe("watch", () => {
  it("evaluates every expression on refresh", async () => {
    const watch = new WatchList(async (e: string) => {
      if (e === "bad") throw new Error("not defined");
      return `=${e}`;
    });
    watch.add("a");
    watch.add("bad");

    await expect(watch.refresh()).resolves.toEqual([
      { expression: "a", value: "=a" },
      { expression: "bad", error: "not defined" },
    ]);
  });

  it("edit and remove", () => {
    const watch = new WatchList(async () => "");
    watch.add("a");
    watch.add("b");

    watch.edit(0, "c");
    watch.remove(1);

    expect(watch.expressions()).toEqual(["c"]);
  });
});

describe("debug console history", () => {
  it("goes back through earlier inputs and forward again", () => {
    const history = new ReplHistory();
    history.add("1 + 1");
    history.add("x");

    expect(history.previous()).eq("x");
    expect(history.previous()).eq("1 + 1");
    expect(history.next()).eq("x");
    expect(history.next()).eq("");
  });

  it("keeps multi-line inputs whole", () => {
    const history = new ReplHistory();
    history.add("if (a) {\n  b()\n}");

    expect(history.previous()).eq("if (a) {\n  b()\n}");
  });
});

describe("inline values", () => {
  const lines = ["function f(x) {", "  const y = x * 2;", "  log(y);", "  return z;", "}"];
  const variables = [
    { name: "x", value: "3" },
    { name: "y", value: "6" },
  ];

  it("shows the values of variables named on each line up to where it stopped", () => {
    expect(inlineValues(lines, { startLine: 0, endLine: 4 }, 2, variables)).toEqual([
      { line: 0, text: "x = 3" },
      { line: 1, text: "y = 6, x = 3" },
      { line: 2, text: "y = 6" },
    ]);
  });

  it("only matches whole names", () => {
    expect(inlineValues(["  const xy = 1;"], { startLine: 0, endLine: 0 }, 0, [{ name: "x", value: "3" }])).toEqual([]);
  });
});

describe("expressionAt", () => {
  it("takes the member chain up to the cursor", () => {
    expect(expressionAt("foo(a.b.c, d)", 8)).eq("a.b.c");
    expect(expressionAt("foo(a.b.c, d)", 6)).eq("a.b");
  });

  it("includes this and indexes", () => {
    expect(expressionAt("return this.x;", 12)).eq("this.x");
    expect(expressionAt("list[0].name", 9)).eq("list[0].name");
  });

  it("returns nothing off a name", () => {
    expect(expressionAt("a + b", 2)).toBeUndefined();
  });
});
