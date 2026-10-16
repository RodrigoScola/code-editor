// Test coverage from lcov reports

export interface CoverageCount {
  covered: number;
  total: number;
}

export interface CoverageSummary {
  lines: CoverageCount;
  functions: CoverageCount;
  branches: CoverageCount;
}

export interface FileCoverage {
  path: string;
  // 1-based line -> hits
  lines: Map<number, number>;
  functions: { name: string; line: number; hits: number }[];
  // "-" in lcov (never ran) is taken: 0
  branches: { line: number; block: number; branch: number; taken: number }[];
  summary: CoverageSummary;
}

// the same file twice is merged
export function parseLcov(text: string): FileCoverage[] {
  throw new Error("not implemented");
}

// testing.displayedCoveragePercent; nothing to cover is 100
export function displayedPercent(
  file: FileCoverage,
  mode: "totalCoverage" | "statement" | "minimum",
): number {
  throw new Error("not implemented");
}

// the summary of the files inside folder
export function folderCoverage(files: FileCoverage[], folder: string): CoverageSummary {
  throw new Error("not implemented");
}

// partial: some branches on the line never taken; undefined: not code
export function lineState(
  file: FileCoverage,
  line: number,
): "covered" | "uncovered" | "partial" | undefined {
  throw new Error("not implemented");
}

// the next uncovered line after line, wrapping
export function nextUncovered(file: FileCoverage, line: number): number | undefined {
  throw new Error("not implemented");
}
