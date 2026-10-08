import { describe, expect, it } from "vitest";
import { computeFoldingRanges } from "../../../src/Editor/folding.js";
import { code } from "../harness.js";

// Proposed module src/Editor/folding.ts:
//   computeFoldingRanges(lines, { tabSize, markers? }) -> [{ start, end }]
//     0-based lines, sorted by start. An indentation range starts at a line
//     followed by more indented lines and ends at the last of them (a
//     closing } at the starting indentation stays outside). Marker ranges
//     (//#region ... //#endregion in TypeScript) include both marker lines.
//
// Commands (Ctrl+Shift+[ and friends):
//   editor.fold / editor.unfold / editor.toggleFold
//   editor.foldRecursively / editor.unfoldRecursively
//   editor.foldAll / editor.unfoldAll
//   editor.foldLevel1 ... editor.foldLevel7
//   editor.foldAllMarkerRegions / editor.unfoldAllMarkerRegions
//   editor.createFoldingRangeFromSelection / editor.removeManualFoldingRanges
//   editor.gotoParentFold / editor.gotoNextFold / editor.gotoPreviousFold
// codeWindow.foldedRanges() -> the closed ranges, [{ start, end }].

const markers = { start: /^\s*\/\/\s*#region\b/, end: /^\s*\/\/\s*#endregion\b/ };

describe("computeFoldingRanges by indentation", () => {
  it("finds a block", () => {
    expect(computeFoldingRanges(["function f() {", "  a;", "  b;", "}"], { tabSize: 4 })).toEqual([
      { start: 0, end: 2 },
    ]);
  });

  it("finds nested blocks", () => {
    const lines = ["a {", "  b {", "    c", "  }", "}"];

    expect(computeFoldingRanges(lines, { tabSize: 4 })).toEqual([
      { start: 0, end: 3 },
      { start: 1, end: 2 },
    ]);
  });

  it("finds nothing in flat text", () => {
    expect(computeFoldingRanges(["a", "b", "c"], { tabSize: 4 })).toEqual([]);
  });

  it("counts a tab as tabSize spaces", () => {
    expect(computeFoldingRanges(["a", "\tb", "    c", "d"], { tabSize: 4 })).toEqual([
      { start: 0, end: 2 },
    ]);
  });

  it("keeps empty lines inside a block", () => {
    expect(computeFoldingRanges(["a", "  b", "", "  c", "d"], { tabSize: 4 })).toEqual([
      { start: 0, end: 3 },
    ]);
  });
});

describe("computeFoldingRanges by markers", () => {
  it("folds a region from its start marker to its end marker", () => {
    const lines = ["//#region setup", "a", "b", "//#endregion"];

    expect(computeFoldingRanges(lines, { tabSize: 4, markers })).toEqual([{ start: 0, end: 3 }]);
  });

  it("nests regions", () => {
    const lines = ["//#region a", "//#region b", "x", "//#endregion", "//#endregion"];

    expect(computeFoldingRanges(lines, { tabSize: 4, markers })).toEqual([
      { start: 0, end: 4 },
      { start: 1, end: 3 },
    ]);
  });

  it("ignores an end marker without a start", () => {
    expect(computeFoldingRanges(["a", "//#endregion"], { tabSize: 4, markers })).toEqual([]);
  });
});

const source = [
  "class A {", //      0
  "  f() {", //        1
  "    x;", //         2
  "  }", //            3
  "  g() {", //        4
  "    y;", //         5
  "  }", //            6
  "}", //              7
].join("\n");

const ts = { path: "a.ts" };

describe("fold commands", () => {
  it("fold closes the range starting at the cursor line", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 1;

    vs.run("editor.fold");

    expect(vs.window().foldedRanges()).toEqual([{ start: 1, end: 2 }]);
  });

  it("fold inside a block closes the block around the cursor", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 2;

    vs.run("editor.fold");

    expect(vs.window().foldedRanges()).toEqual([{ start: 1, end: 2 }]);
  });

  it("unfold opens it again", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 1;

    expect(vs.run("editor.fold").run("editor.unfold").window().foldedRanges()).toEqual([]);
  });

  it("toggleFold switches", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 1;

    expect(vs.run("editor.toggleFold").window().foldedRanges()).toHaveLength(1);
    expect(vs.run("editor.toggleFold").window().foldedRanges()).toHaveLength(0);
  });

  it("foldAll closes every range and unfoldAll opens them", () => {
    const vs = code(source, ts).run("editor.foldAll");
    expect(vs.window().foldedRanges()).toHaveLength(3);

    expect(vs.run("editor.unfoldAll").window().foldedRanges()).toEqual([]);
  });

  it("foldRecursively closes the range and everything inside it", () => {
    const vs = code(source, ts).run("editor.foldRecursively");

    expect(vs.window().foldedRanges()).toEqual([
      { start: 0, end: 6 },
      { start: 1, end: 2 },
      { start: 4, end: 5 },
    ]);
  });

  it("foldLevel2 closes only the second-level ranges", () => {
    const vs = code(source, ts).run("editor.foldLevel2");

    expect(vs.window().foldedRanges()).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 5 },
    ]);
  });

  it("cursorDown skips over a closed range", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 1;

    vs.run("editor.fold").run("cursorDown");

    expect(vs.window().cursor().line).eq(3);
  });
});

describe("marker regions", () => {
  const regions = ["//#region a", "x", "//#endregion", "y {", "  z", "}"].join("\n");

  it("foldAllMarkerRegions closes only the marker regions", () => {
    const vs = code(regions, ts).run("editor.foldAllMarkerRegions");

    expect(vs.window().foldedRanges()).toEqual([{ start: 0, end: 2 }]);
  });

  it("unfoldAllMarkerRegions opens them", () => {
    const vs = code(regions, ts)
      .run("editor.foldAllMarkerRegions")
      .run("editor.unfoldAllMarkerRegions");

    expect(vs.window().foldedRanges()).toEqual([]);
  });
});

describe("manual folding ranges", () => {
  it("createFoldingRangeFromSelection folds the selected lines", () => {
    const vs = code("«a\nb\nc»\nd").run("editor.createFoldingRangeFromSelection");

    expect(vs.window().foldedRanges()).toEqual([{ start: 0, end: 2 }]);
  });

  it("removeManualFoldingRanges removes them", () => {
    const vs = code("«a\nb\nc»\nd")
      .run("editor.createFoldingRangeFromSelection")
      .run("editor.removeManualFoldingRanges");

    expect(vs.window().foldedRanges()).toEqual([]);
  });
});

describe("moving between folds", () => {
  it("gotoParentFold goes to the start of the enclosing range", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 2;

    expect(vs.run("editor.gotoParentFold").window().cursor().line).eq(1);
  });

  it("gotoNextFold goes to the start of the next range", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 2;

    expect(vs.run("editor.gotoNextFold").window().cursor().line).eq(4);
  });

  it("gotoPreviousFold goes to the start of the previous range", () => {
    const vs = code(source, ts);
    vs.window().cursor().line = 5;

    expect(vs.run("editor.gotoPreviousFold").window().cursor().line).eq(1);
  });
});
