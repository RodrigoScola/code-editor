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
    const ide = code(source, ts);
    ide.window().cursor().line = 1;

    ide.executeCommand("folding.fold");

    expect(ide.window().foldedRanges()).toEqual([{ start: 1, end: 2 }]);
  });

  it("fold inside a block closes the block around the cursor", () => {
    const ide = code(source, ts);
    ide.window().cursor().line = 2;

    ide.executeCommand("folding.fold");

    expect(ide.window().foldedRanges()).toEqual([{ start: 1, end: 2 }]);
  });

  it("unfold opens it again", () => {
    const ide = code(source, ts);
    ide.window().cursor().line = 1;

    expect(ide.executeCommand("folding.fold").executeCommand("folding.unfold").window().foldedRanges()).toEqual([]);
  });

  it("toggleFold switches", () => {
    const ide = code(source, ts);
    ide.window().cursor().line = 1;

    expect(ide.executeCommand("folding.toggle").window().foldedRanges()).toHaveLength(1);
    expect(ide.executeCommand("folding.toggle").window().foldedRanges()).toHaveLength(0);
  });

  it("foldAll closes every range and unfoldAll opens them", () => {
    const ide = code(source, ts).executeCommand("folding.foldAll");
    expect(ide.window().foldedRanges()).toHaveLength(3);

    expect(ide.executeCommand("folding.unfoldAll").window().foldedRanges()).toEqual([]);
  });

  it("foldRecursively closes the range and everything inside it", () => {
    const ide = code(source, ts).executeCommand("folding.foldRecursively");

    expect(ide.window().foldedRanges()).toEqual([
      { start: 0, end: 6 },
      { start: 1, end: 2 },
      { start: 4, end: 5 },
    ]);
  });

  it("foldLevel2 closes only the second-level ranges", () => {
    const ide = code(source, ts).executeCommand("folding.foldLevel2");

    expect(ide.window().foldedRanges()).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 5 },
    ]);
  });

  it("cursorDown skips over a closed range", () => {
    const ide = code(source, ts);
    ide.window().cursor().line = 1;

    ide.executeCommand("folding.fold").executeCommand("textEditor.cursorDown");

    expect(ide.window().cursor().line).eq(3);
  });
});

describe("marker regions", () => {
  const regions = ["//#region a", "x", "//#endregion", "y {", "  z", "}"].join("\n");

  it("foldAllMarkerRegions closes only the marker regions", () => {
    const ide = code(regions, ts).executeCommand("folding.foldRegions");

    expect(ide.window().foldedRanges()).toEqual([{ start: 0, end: 2 }]);
  });

  it("unfoldAllMarkerRegions opens them", () => {
    const ide = code(regions, ts)
      .executeCommand("folding.foldRegions")
      .executeCommand("folding.unfoldRegions");

    expect(ide.window().foldedRanges()).toEqual([]);
  });
});

describe("manual folding ranges", () => {
  it("createFoldingRangeFromSelection folds the selected lines", () => {
    const ide = code("«a\nb\nc»\nd").executeCommand("folding.createFromSelection");

    expect(ide.window().foldedRanges()).toEqual([{ start: 0, end: 2 }]);
  });

  it("removeManualFoldingRanges removes them", () => {
    const ide = code("«a\nb\nc»\nd")
      .executeCommand("folding.createFromSelection")
      .executeCommand("folding.removeManualRanges");

    expect(ide.window().foldedRanges()).toEqual([]);
  });
});

describe("moving between folds", () => {
  it("gotoParentFold goes to the start of the enclosing range", () => {
    const ide = code(source, ts);
    ide.window().cursor().line = 2;

    expect(ide.executeCommand("folding.goToParent").window().cursor().line).eq(1);
  });

  it("gotoNextFold goes to the start of the next range", () => {
    const ide = code(source, ts);
    ide.window().cursor().line = 2;

    expect(ide.executeCommand("folding.goToNext").window().cursor().line).eq(4);
  });

  it("gotoPreviousFold goes to the start of the previous range", () => {
    const ide = code(source, ts);
    ide.window().cursor().line = 5;

    expect(ide.executeCommand("folding.goToPrevious").window().cursor().line).eq(1);
  });
});
