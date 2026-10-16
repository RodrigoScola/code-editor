// Reading test results from tools that don't talk to the editor directly

export interface ReportedTest {
  name: string;
  // "math > division"
  suite?: string;
  path?: string;
  status: "passed" | "failed" | "skipped" | "errored" | "todo";
  message?: string;
  // ms
  duration?: number;
}

// JUnit XML (testsuite / testcase / failure / error / skipped)
export function parseJUnit(xml: string): ReportedTest[] {
  throw new Error("not implemented");
}

// TAP 13 (ok / not ok, # SKIP, # TODO, YAML block, Bail out!)
export function parseTap(text: string): ReportedTest[] {
  throw new Error("not implemented");
}

// Vitest / Jest --reporter=json
export function parseVitestJson(json: string): ReportedTest[] {
  throw new Error("not implemented");
}
