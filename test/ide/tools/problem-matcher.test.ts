import { describe, expect, it } from "vitest";
import { parseProblems } from "../../../src/Tools/problemMatcher.js";
import { runTask } from "../../../src/Tools/tasks.js";

// Proposed modules:
//
// src/Tools/problemMatcher.ts (VS Code problem matchers, Vim errorformat):
//   parseProblems(output, matcher) -> problems
//     matcher: "tsc" | "gcc"
//     problem: { path, line, column (0-based), severity, message, code? }
//   Lines that aren't problems are ignored.
//
// src/Tools/tasks.ts (VS Code tasks, Vim :make):
//   runTask({ command, args?, cwd?, matcher? })
//     -> Promise<{ exitCode, output, problems }>
// The problems go into the diagnostics store and the quickfix list.

describe("tsc", () => {
  it("reads the file(line,col) format", () => {
    const [problem] = parseProblems(
      "src/a.ts(3,5): error TS2322: Type 'string' is not assignable to type 'number'.",
      "tsc",
    );

    expect(problem).toEqual({
      path: "src/a.ts",
      line: 2,
      column: 4,
      severity: "error",
      code: "TS2322",
      message: "Type 'string' is not assignable to type 'number'.",
    });
  });

  it("reads the file:line:col - format", () => {
    const [problem] = parseProblems(
      "src/a.ts:3:5 - error TS2322: Type 'string' is not assignable to type 'number'.",
      "tsc",
    );

    expect(problem).toMatchObject({ path: "src/a.ts", line: 2, column: 4, code: "TS2322" });
  });

  it("keeps Windows paths with a drive letter", () => {
    const [problem] = parseProblems("C:\\proj\\a.ts(1,2): error TS1005: ';' expected.", "tsc");

    expect(problem.path).eq("C:\\proj\\a.ts");
    expect(problem.line).eq(0);
  });

  it("reads several problems and skips everything else", () => {
    const output = [
      "src/a.ts(1,1): error TS1: one",
      "    some code excerpt",
      "src/b.ts(2,2): warning TS2: two",
      "",
      "Found 2 errors.",
    ].join("\n");

    const problems = parseProblems(output, "tsc");

    expect(problems.map((p) => p.path)).toEqual(["src/a.ts", "src/b.ts"]);
    expect(problems[1].severity).eq("warning");
  });
});

describe("gcc", () => {
  it("reads file:line:col: severity: message", () => {
    const [problem] = parseProblems(
      "main.c:10:5: warning: unused variable 'x' [-Wunused-variable]",
      "gcc",
    );

    expect(problem).toMatchObject({
      path: "main.c",
      line: 9,
      column: 4,
      severity: "warning",
      message: "unused variable 'x' [-Wunused-variable]",
    });
  });
});

describe("runTask", () => {
  it("collects the output and the exit code", async () => {
    const result = await runTask({
      command: process.execPath,
      args: ["-e", "console.log('hi'); process.exit(3)"],
    });

    expect(result.exitCode).eq(3);
    expect(result.output).toContain("hi");
  });

  it("parses problems from the output", async () => {
    const result = await runTask({
      command: process.execPath,
      args: ["-e", "console.log('a.ts(1,2): error TS1: bad')"],
      matcher: "tsc",
    });

    expect(result.problems).toEqual([
      { path: "a.ts", line: 0, column: 1, severity: "error", code: "TS1", message: "bad" },
    ]);
  });
});
