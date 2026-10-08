import { describe, expect, it } from "vitest";
import { computeFoldingRanges } from "../../../src/Editor/folding.js";
import { code } from "../harness.js";

// Edge cases for folding (base spec: folding.test.ts).
// More options for computeFoldingRanges:
//   offSide: true for indentation languages (Python, YAML): empty lines at
//     the end of a block belong to it
//   maxRanges: only the outermost ranges are kept past this count
//     (editor.foldingMaximumRegions)

describe("computeFoldingRanges", () => {
  it("in brace languages an empty line before the closing bracket is inside the block", () => {
    expect(computeFoldingRanges(["a {", "  b", "", "}"], { tabSize: 4 })).toEqual([{ start: 0, end: 2 }]);
  });

  it("in off-side languages trailing empty lines are left out of the block", () => {
    expect(computeFoldingRanges(["def f():", "    x", "", "y"], { tabSize: 4, offSide: true })).toEqual([
      { start: 0, end: 1 },
    ]);
  });

  it("an indented block at the end of the file", () => {
    expect(computeFoldingRanges(["a", "  b", "  c"], { tabSize: 4 })).toEqual([{ start: 0, end: 2 }]);
  });

  it("keeps the outermost ranges when there are too many", () => {
    const lines = ["a", "  b", "    c", "      d"];

    expect(computeFoldingRanges(lines, { tabSize: 4, maxRanges: 2 })).toEqual([
      { start: 0, end: 3 },
      { start: 1, end: 3 },
    ]);
  });

  it("a region marker inside an indented block", () => {
    const markers = { start: /^\s*\/\/\s*#region\b/, end: /^\s*\/\/\s*#endregion\b/ };
    const lines = ["f {", "  //#region r", "  x", "  //#endregion", "}"];

    expect(computeFoldingRanges(lines, { tabSize: 4, markers })).toEqual(
      expect.arrayContaining([
        { start: 0, end: 3 },
        { start: 1, end: 3 },
      ]),
    );
  });
});

const source = ["a {", "  b {", "    c", "  }", "}"].join("\n");

describe("fold commands", () => {
  it("fold on a line that starts no range folds the range around it", () => {
    const vs = code(source, { path: "a.ts" });
    vs.window().cursor().line = 2;

    expect(vs.run("editor.fold").window().foldedRanges()).toEqual([{ start: 1, end: 2 }]);
  });

  it("folding twice closes the next range out", () => {
    const vs = code(source, { path: "a.ts" });
    vs.window().cursor().line = 2;

    vs.run("editor.fold").run("editor.fold");

    expect(vs.window().foldedRanges()).toEqual(expect.arrayContaining([{ start: 0, end: 3 }]));
  });

  it("unfoldRecursively opens the range and everything inside", () => {
    const vs = code(source, { path: "a.ts" }).run("editor.foldAll").run("editor.unfoldRecursively");

    expect(vs.window().foldedRanges()).toEqual([]);
  });

  it("foldLevel does not fold the range the cursor is in", () => {
    const vs = code(source, { path: "a.ts" });
    vs.window().cursor().line = 2;

    expect(vs.run("editor.foldLevel2").window().foldedRanges()).toEqual([]);
  });

  it("editing inside a folded range opens it", () => {
    const vs = code(source, { path: "a.ts" });
    vs.window().cursor().line = 1;
    vs.run("editor.fold");
    vs.window().setSelections([{ anchor: { line: 2, column: 0 }, active: { line: 2, column: 0 } }]);

    vs.type("x");

    expect(vs.window().foldedRanges()).toEqual([]);
  });

  it("deleting the lines of a folded range removes the fold", () => {
    const vs = code(source, { path: "a.ts" });
    vs.window().cursor().line = 1;
    vs.run("editor.fold");

    vs.run("editor.action.deleteLines");

    expect(vs.window().foldedRanges()).toEqual([]);
  });
});
