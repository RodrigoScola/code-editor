import { describe, expect, it } from "vitest";
import { callHierarchy, typeHierarchy } from "../../../src/Lsp/hierarchy.js";
import { code } from "../harness.js";

// Call hierarchy (VS Code: references-view.showCallHierarchy, Shift+Alt+H)
// and type hierarchy (references-view.showTypeHierarchy): a tree that
// starts at the symbol under the cursor and grows one level each time a
// row is expanded. The data comes from a provider (a language server's
// callHierarchy/* and typeHierarchy/* requests).
//
// Proposed src/Lsp/hierarchy.ts:
//   item: { name, kind, detail?, path, range, selectionRange }
//   callHierarchy(provider, path, position) -> view, or undefined when the
//     provider has nothing at that position
//     provider: { prepare(path, position) -> item[],
//                 incomingCalls(item) -> { from: item, fromRanges }[],
//                 outgoingCalls(item) -> { to: item, fromRanges }[] }
//   typeHierarchy(provider, path, position) -> view or undefined
//     provider: { prepare, supertypes(item) -> item[], subtypes(item) -> item[] }
//   view.direction: "incoming" | "outgoing" (calls), "supertypes" |
//     "subtypes" (types). Calls start with incoming, types with subtypes.
//   view.toggle()            switch direction; the tree starts over
//   view.rows() -> [{ depth, name, detail?, expanded }], the visible rows
//   view.expand(row) / view.collapse(row)   children are asked for once,
//     when a row is first expanded
//   view.target(row) -> { path, range } to open: for incoming calls the
//     first call site (fromRanges[0] in the caller), otherwise the item's
//     selectionRange
//
// In the editor: language.showCallHierarchy / language.showTypeHierarchy
// with the providers registered on ctx.languages
// (registerCallHierarchyProvider / registerTypeHierarchyProvider);
// ctx.hierarchy() is the open view.

const pos = (line: number, character: number) => ({ line, character });
const range = (line: number, start: number, end: number) => ({ start: pos(line, start), end: pos(line, end) });

function fn(name: string, line: number) {
  return { name, kind: "function", path: "a.ts", range: range(line, 0, 20), selectionRange: range(line, 9, 9 + name.length) };
}

// main -> render -> draw, and main -> draw
const main = fn("main", 0);
const render = fn("render", 5);
const draw = fn("draw", 10);

function calls() {
  const asked: string[] = [];
  const outgoing: Record<string, { to: typeof main; fromRanges: ReturnType<typeof range>[] }[]> = {
    main: [
      { to: render, fromRanges: [range(1, 2, 8)] },
      { to: draw, fromRanges: [range(2, 2, 6)] },
    ],
    render: [{ to: draw, fromRanges: [range(6, 2, 6)] }],
    draw: [],
  };
  const incoming: Record<string, { from: typeof main; fromRanges: ReturnType<typeof range>[] }[]> = {
    main: [],
    render: [{ from: main, fromRanges: [range(1, 2, 8)] }],
    draw: [
      { from: main, fromRanges: [range(2, 2, 6)] },
      { from: render, fromRanges: [range(6, 2, 6), range(7, 2, 6)] },
    ],
  };
  return {
    asked,
    prepare: (_path: string, position: { line: number }) =>
      [main, render, draw].filter((item) => item.range.start.line === position.line),
    incomingCalls: (item: typeof main) => {
      asked.push(`in ${item.name}`);
      return incoming[item.name];
    },
    outgoingCalls: (item: typeof main) => {
      asked.push(`out ${item.name}`);
      return outgoing[item.name];
    },
  };
}

const names = (view: { rows(): { depth: number; name: string }[] }) =>
  view.rows().map((row) => "  ".repeat(row.depth) + row.name);

describe("call hierarchy", () => {
  it("starts at the symbol under the cursor, showing incoming calls", () => {
    const view = callHierarchy(calls(), "a.ts", pos(10, 0))!;

    expect(view.direction).eq("incoming");
    expect(names(view)).toEqual(["draw"]);
  });

  it("is undefined when there is no symbol there", () => {
    expect(callHierarchy(calls(), "a.ts", pos(3, 0))).eq(undefined);
  });

  it("expanding a row shows its callers", () => {
    const view = callHierarchy(calls(), "a.ts", pos(10, 0))!;

    view.expand(0);

    expect(names(view)).toEqual(["draw", "  main", "  render"]);
  });

  it("expands level by level", () => {
    const view = callHierarchy(calls(), "a.ts", pos(10, 0))!;

    view.expand(0);
    view.expand(2); // render

    expect(names(view)).toEqual(["draw", "  main", "  render", "    main"]);
  });

  it("collapsing hides the children, and expanding again doesn't ask twice", () => {
    const provider = calls();
    const view = callHierarchy(provider, "a.ts", pos(10, 0))!;

    view.expand(0);
    view.collapse(0);
    expect(names(view)).toEqual(["draw"]);

    view.expand(0);
    expect(provider.asked.filter((a) => a === "in draw")).length(1);
  });

  it("doesn't ask for children before a row is expanded", () => {
    const provider = calls();

    callHierarchy(provider, "a.ts", pos(10, 0));

    expect(provider.asked).toEqual([]);
  });

  it("toggle shows outgoing calls instead", () => {
    const view = callHierarchy(calls(), "a.ts", pos(0, 0))!;

    view.toggle();
    view.expand(0);

    expect(view.direction).eq("outgoing");
    expect(names(view)).toEqual(["main", "  render", "  draw"]);
  });

  it("a recursive call can be expanded without looping forever", () => {
    const self = fn("loop", 0);
    const provider = {
      prepare: () => [self],
      incomingCalls: () => [{ from: self, fromRanges: [range(1, 2, 6)] }],
      outgoingCalls: () => [],
    };
    const view = callHierarchy(provider, "a.ts", pos(0, 0))!;

    view.expand(0);
    view.expand(1);

    expect(names(view)).toEqual(["loop", "  loop", "    loop"]);
  });

  it("an incoming call opens at the call site in the caller", () => {
    const view = callHierarchy(calls(), "a.ts", pos(10, 0))!;
    view.expand(0);

    expect(view.target(2)).toEqual({ path: "a.ts", range: range(6, 2, 6) });
  });

  it("the root and outgoing calls open at the function's name", () => {
    const view = callHierarchy(calls(), "a.ts", pos(0, 0))!;

    expect(view.target(0)).toEqual({ path: "a.ts", range: main.selectionRange });

    view.toggle();
    view.expand(0);
    expect(view.target(1)).toEqual({ path: "a.ts", range: render.selectionRange });
  });
});

describe("type hierarchy", () => {
  const cls = (name: string, line: number) => ({ ...fn(name, line), kind: "class" });
  const shape = cls("Shape", 0);
  const circle = cls("Circle", 5);
  const square = cls("Square", 10);
  const unit = cls("UnitCircle", 15);

  const types = {
    prepare: (_path: string, position: { line: number }) =>
      [shape, circle, square, unit].filter((item) => item.range.start.line === position.line),
    supertypes: (item: typeof shape) =>
      ({ Shape: [], Circle: [shape], Square: [shape], UnitCircle: [circle] })[item.name] ?? [],
    subtypes: (item: typeof shape) =>
      ({ Shape: [circle, square], Circle: [unit], Square: [], UnitCircle: [] })[item.name] ?? [],
  };

  it("starts with the subtypes", () => {
    const view = typeHierarchy(types, "a.ts", pos(0, 0))!;

    view.expand(0);
    view.expand(1);

    expect(view.direction).eq("subtypes");
    expect(names(view)).toEqual(["Shape", "  Circle", "    UnitCircle", "  Square"]);
  });

  it("toggle shows the supertypes", () => {
    const view = typeHierarchy(types, "a.ts", pos(15, 0))!;

    view.toggle();
    view.expand(0);
    view.expand(1);

    expect(view.direction).eq("supertypes");
    expect(names(view)).toEqual(["UnitCircle", "  Circle", "    Shape"]);
  });

  it("a type with no subtypes expands to nothing", () => {
    const view = typeHierarchy(types, "a.ts", pos(10, 0))!;

    view.expand(0);

    expect(names(view)).toEqual(["Square"]);
  });
});

describe("in the editor", () => {
  it("showCallHierarchy opens the view for the symbol under the cursor", () => {
    const ide = code("function main() {}\n\n\n\n\nfunction render() {}\n\n\n\n\n|function draw() {}", {
      path: "a.ts",
    });
    ide.languages.registerCallHierarchyProvider("typescript", calls());

    ide.executeCommand("language.showCallHierarchy");

    expect(names(ide.hierarchy())).toEqual(["draw"]);
  });

  it("says so when there is nothing to show", () => {
    const ide = code("|x", { path: "a.ts" });

    ide.executeCommand("language.showCallHierarchy");

    expect(ide.messages().at(-1)?.text).eq("No call hierarchy results");
  });
});
