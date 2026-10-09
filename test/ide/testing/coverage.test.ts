import { describe, expect, it } from "vitest";
import {
  displayedPercent,
  folderCoverage,
  lineState,
  nextUncovered,
  parseLcov,
} from "../../../src/Testing/coverage.js";

// Test coverage. Proposed src/Testing/coverage.ts:
//   parseLcov(text) -> [{ path, lines: Map<line, hits>, functions: [{ name,
//     line, hits }], branches: [{ line, block, branch, taken }],
//     summary: { lines: { covered, total }, functions: {...}, branches: {...} } }]
//     (lines 1-based as in lcov; "-" taken means the branch never ran)
//   displayedPercent(file, "totalCoverage" | "statement" | "minimum")
//     (testing.displayedCoveragePercent): total = everything covered over
//     everything; statement = lines only; minimum = the lowest of the three
//   folderCoverage(files, folder) -> the summary of the files inside
//   lineState(file, line) -> "covered" | "uncovered" | "partial" (some
//     branches on the line never taken) | undefined (not code)
//   nextUncovered(file, line) -> the next uncovered line after it, wrapping

const lcov = `TN:
SF:/p/src/a.ts
FN:1,add
FN:5,unused
FNDA:3,add
FNDA:0,unused
DA:1,3
DA:2,3
DA:5,0
DA:6,0
DA:8,1
BRDA:8,0,0,1
BRDA:8,0,1,-
LF:5
LH:3
BRF:2
BRH:1
FNF:2
FNH:1
end_of_record
SF:/p/src/b.ts
DA:1,1
end_of_record
SF:/p/test/c.ts
DA:1,0
end_of_record
`;

describe("parseLcov", () => {
  const [a] = parseLcov(lcov);

  it("reads each file", () => {
    expect(parseLcov(lcov).map((f: { path: string }) => f.path)).toEqual(["/p/src/a.ts", "/p/src/b.ts", "/p/test/c.ts"]);
  });

  it("reads line hits", () => {
    expect(a.lines.get(1)).eq(3);
    expect(a.lines.get(5)).eq(0);
  });

  it("reads functions with their hit counts", () => {
    expect(a.functions).toEqual([
      { name: "add", line: 1, hits: 3 },
      { name: "unused", line: 5, hits: 0 },
    ]);
  });

  it("reads branches, with - meaning never taken", () => {
    expect(a.branches).toEqual([
      { line: 8, block: 0, branch: 0, taken: 1 },
      { line: 8, block: 0, branch: 1, taken: 0 },
    ]);
  });

  it("summarizes", () => {
    expect(a.summary).toEqual({
      lines: { covered: 3, total: 5 },
      functions: { covered: 1, total: 2 },
      branches: { covered: 1, total: 2 },
    });
  });

  it("computes the summary when the totals are missing", () => {
    const [b] = parseLcov("SF:/x.ts\nDA:1,1\nDA:2,0\nend_of_record\n");

    expect(b.summary.lines).toEqual({ covered: 1, total: 2 });
  });
});

describe("displayedPercent", () => {
  const [a] = parseLcov(lcov);

  it("statement is lines only", () => {
    expect(displayedPercent(a, "statement")).toBeCloseTo(60);
  });

  it("totalCoverage counts lines, branches and functions together", () => {
    expect(displayedPercent(a, "totalCoverage")).toBeCloseTo((5 / 9) * 100);
  });

  it("minimum is the lowest of the three", () => {
    expect(displayedPercent(a, "minimum")).toBeCloseTo(50);
  });
});

describe("folders and lines", () => {
  const files = parseLcov(lcov);
  const [a] = files;

  it("folderCoverage adds up the files inside", () => {
    expect(folderCoverage(files, "/p/src").lines).toEqual({ covered: 4, total: 6 });
  });

  it("lineState", () => {
    expect(lineState(a, 1)).eq("covered");
    expect(lineState(a, 5)).eq("uncovered");
    expect(lineState(a, 8)).eq("partial");
    expect(lineState(a, 3)).toBeUndefined();
  });

  it("nextUncovered goes to the next uncovered line and wraps", () => {
    expect(nextUncovered(a, 1)).eq(5);
    expect(nextUncovered(a, 5)).eq(6);
    expect(nextUncovered(a, 6)).eq(5);
  });
});
