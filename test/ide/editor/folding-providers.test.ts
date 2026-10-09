import { describe, expect, it } from "vitest";
import { mergeFoldingRanges } from "../../../src/Editor/folding.js";
import { code } from "../harness.js";

// Folding ranges from a language (a language server's foldingRange
// request, or ctx.languages.registerFoldingRangeProvider), instead of
// indentation. See test/ide/editor/folding-commands.test.ts for the
// commands and the indentation ranges.
//
// Proposed, added to src/Editor/folding.ts:
//   mergeFoldingRanges(ranges, { lineCount, limit = 5000 })
//     -> the ranges to use, sorted by start
//     ranges: { start, end, kind?: "comment" | "imports" | "region" }
//     - a range must span at least two lines and stay inside the document
//     - a range that crosses another (starts inside it, ends after it) is
//       dropped; nested ranges are fine
//     - two ranges starting on the same line: the first one is kept
//     - over the limit (editor.foldingMaximumRegions), the most deeply
//       nested ranges are dropped first
//
// Settings:
//   folding_strategy "auto" | "indentation" (editor.foldingStrategy):
//     "auto" uses the provider when there is one, else indentation
//   folding_imports_by_default (editor.foldingImportsByDefault): "imports"
//     ranges start folded when a file is opened
// codeWindow.foldedRanges() -> the closed ranges, [{ start, end }]

const lines = 30;
const starts = (ranges: { start: number; end: number }[]) => ranges.map((r) => [r.start, r.end]);

describe("mergeFoldingRanges", () => {
  it("sorts by start line", () => {
    const ranges = mergeFoldingRanges([{ start: 10, end: 12 }, { start: 2, end: 5 }], { lineCount: lines });

    expect(starts(ranges)).toEqual([[2, 5], [10, 12]]);
  });

  it("drops ranges of a single line", () => {
    expect(mergeFoldingRanges([{ start: 3, end: 3 }], { lineCount: lines })).toEqual([]);
  });

  it("drops ranges that end before they start or leave the document", () => {
    const ranges = mergeFoldingRanges(
      [{ start: 5, end: 2 }, { start: -1, end: 4 }, { start: 25, end: 40 }],
      { lineCount: lines },
    );

    expect(ranges).toEqual([]);
  });

  it("keeps nested ranges", () => {
    const ranges = mergeFoldingRanges([{ start: 0, end: 20 }, { start: 2, end: 5 }], { lineCount: lines });

    expect(starts(ranges)).toEqual([[0, 20], [2, 5]]);
  });

  it("drops a range that crosses an earlier one", () => {
    const ranges = mergeFoldingRanges([{ start: 0, end: 10 }, { start: 5, end: 15 }], { lineCount: lines });

    expect(starts(ranges)).toEqual([[0, 10]]);
  });

  it("keeps the first of two ranges that start on the same line", () => {
    const ranges = mergeFoldingRanges(
      [{ start: 4, end: 9, kind: "comment" as const }, { start: 4, end: 6 }],
      { lineCount: lines },
    );

    expect(ranges).toEqual([{ start: 4, end: 9, kind: "comment" }]);
  });

  it("keeps the kind", () => {
    expect(mergeFoldingRanges([{ start: 0, end: 3, kind: "imports" as const }], { lineCount: lines })[0].kind).eq(
      "imports",
    );
  });

  it("over the limit, drops the deepest ranges first", () => {
    const ranges = mergeFoldingRanges(
      [
        { start: 0, end: 20 },
        { start: 1, end: 10 },
        { start: 2, end: 5 },
        { start: 21, end: 25 },
      ],
      { lineCount: lines, limit: 3 },
    );

    expect(starts(ranges)).toEqual([[0, 20], [1, 10], [21, 25]]);
  });
});

const source = [
  "import a from 'a';", // 0
  "import b from 'b';", // 1
  "import c from 'c';", // 2
  "", //                   3
  "/**", //                4
  " * docs", //            5
  " */", //                6
  "function f() {", //     7
  "  return 1;", //        8
  "}", //                  9
].join("\n");

const provided = [
  { start: 0, end: 2, kind: "imports" },
  { start: 4, end: 6, kind: "comment" },
  { start: 7, end: 9 },
];

function withProvider(text = source) {
  const ide = code("|x", { path: "x.ts" });
  ide.languages.registerFoldingRangeProvider("typescript", {
    provideFoldingRanges: () => provided,
  });
  ide.openMemoryFile("a.ts", text);
  return ide;
}

describe("in the editor", () => {
  it("folds a provider range at the cursor", () => {
    const ide = withProvider();
    const docs = { line: 5, column: 0 }; // inside the doc comment
    ide.setSelections([{ anchor: docs, active: docs }]);

    ide.executeCommand("folding.fold");

    expect(ide.window().foldedRanges()).toEqual([{ start: 4, end: 6 }]);
  });

  it("the import block can be folded, which indentation can't find", () => {
    const ide = withProvider();
    ide.keys("gg");

    ide.executeCommand("folding.fold");

    expect(ide.window().foldedRanges()).toEqual([{ start: 0, end: 2 }]);
  });

  it('folding_strategy "indentation" ignores the provider', () => {
    const ide = code("|x", { path: "x.ts" }).setting("folding_strategy", "indentation");
    ide.languages.registerFoldingRangeProvider("typescript", { provideFoldingRanges: () => provided });
    ide.openMemoryFile("a.ts", source);
    ide.keys("gg");

    ide.executeCommand("folding.fold");

    expect(ide.window().foldedRanges()).toEqual([]);
  });

  it("folding_imports_by_default folds the imports when the file opens", () => {
    const ide = code("|x", { path: "x.ts" }).setting("folding_imports_by_default", true);
    ide.languages.registerFoldingRangeProvider("typescript", { provideFoldingRanges: () => provided });

    ide.openMemoryFile("a.ts", source);

    expect(ide.window().foldedRanges()).toEqual([{ start: 0, end: 2 }]);
  });

  it("without the setting nothing starts folded", () => {
    expect(withProvider().window().foldedRanges()).toEqual([]);
  });

  it("a provider for another language is not used", () => {
    const ide = code("|x", { path: "x.ts" });
    ide.languages.registerFoldingRangeProvider("python", { provideFoldingRanges: () => provided });
    ide.openMemoryFile("a.ts", source);
    ide.keys("gg");

    ide.executeCommand("folding.fold");

    expect(ide.window().foldedRanges()).toEqual([]);
  });
});
