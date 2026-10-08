import { describe, expect, it } from "vitest";
import { breadcrumbs, outline, symbolAt } from "../../../src/Explorer/outline.js";

// Proposed module src/Explorer/outline.ts: the Outline view and the
// breadcrumbs bar, from document symbols (a provider or Markdown headings).
//   outline(symbols, { sortBy: "position" | "name" | "kind", filter? })
//     -> the tree sorted; with filter, matching symbols and their parents
//   symbolAt(symbols, position) -> the innermost symbol containing it
//     (the outline follows the cursor with this)
//   breadcrumbs(path, symbols, position, { separator? }) -> labels:
//     the file's folders, the file, then the symbol path

const sym = (name: string, kind: string, start: number, end: number, children: unknown[] = []) => ({
  name,
  kind,
  range: { start: { line: start, character: 0 }, end: { line: end, character: 0 } },
  children,
});

const symbols = [
  sym("Zebra", "class", 0, 10, [sym("run", "method", 1, 4), sym("eat", "method", 5, 9)]),
  sym("MAX", "constant", 12, 12),
  sym("apple", "function", 14, 16),
];

const names = (nodes: { name: string }[]) => nodes.map((n) => n.name);

describe("outline", () => {
  it("keeps document order by default", () => {
    expect(names(outline(symbols, { sortBy: "position" }))).toEqual(["Zebra", "MAX", "apple"]);
  });

  it("sorts by name, ignoring case", () => {
    expect(names(outline(symbols, { sortBy: "name" }))).toEqual(["apple", "MAX", "Zebra"]);
    expect(names(outline(symbols, { sortBy: "name" })[2].children)).toEqual(["eat", "run"]);
  });

  it("sorts by kind in VS Code's SymbolKind order (class, function, constant)", () => {
    expect(names(outline(symbols, { sortBy: "kind" }))).toEqual(["Zebra", "apple", "MAX"]);
  });

  it("filters, keeping the parents of matches", () => {
    const filtered = outline(symbols, { sortBy: "position", filter: "eat" });

    expect(names(filtered)).toEqual(["Zebra"]);
    expect(names(filtered[0].children)).toEqual(["eat"]);
  });
});

describe("symbolAt", () => {
  it("finds the innermost symbol around a position", () => {
    expect(symbolAt(symbols, { line: 6, character: 2 })?.name).eq("eat");
  });

  it("finds the outer symbol between its children", () => {
    expect(symbolAt(symbols, { line: 10, character: 0 })?.name).eq("Zebra");
  });

  it("is undefined outside every symbol", () => {
    expect(symbolAt(symbols, { line: 11, character: 0 })).toBeUndefined();
  });
});

describe("breadcrumbs", () => {
  it("lists the folders, the file and the symbols around the cursor", () => {
    expect(breadcrumbs("src/zoo/animals.ts", symbols, { line: 2, character: 0 })).toEqual([
      "src",
      "zoo",
      "animals.ts",
      "Zebra",
      "run",
    ]);
  });

  it("stops at the file outside any symbol", () => {
    expect(breadcrumbs("a.ts", symbols, { line: 11, character: 0 })).toEqual(["a.ts"]);
  });
});
