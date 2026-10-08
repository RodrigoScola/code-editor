import { describe, expect, it } from "vitest";
import { ProblemMatcher, builtInMatcher } from "../../../src/Tasks/problemMatcher.js";

// VS Code problem matchers in full (simple tsc/gcc parsing is specced in
// test/ide/tools/problem-matcher.test.ts). Proposed
// src/Tasks/problemMatcher.ts:
//   new ProblemMatcher(definition, { workspaceFolder, exists? })
//   builtInMatcher("$tsc" | "$tsc-watch" | "$eslint-compact" |
//     "$eslint-stylish" | "$go" | "$jshint" | "$mscompile" | "$lessc" |
//     "$node-sass", options)
//   matcher.processLine(line) for each output line; matcher.problems()
//   matcher.isActive() for background matchers (between begins and ends)
//   problem: { path, startLine, startColumn, endLine?, endColumn?,
//     severity, message, code?, owner, source? } with 0-based positions
// Definition: { owner, source?, severity? (default for lines without one),
//   fileLocation: "absolute" | "relative" | "autoDetect" |
//   ["relative", base] | ["search", { include }], pattern: one or an array
//   of { regexp, file, line, column, endLine, endColumn, location,
//   severity, message, code, loop }, background?: { activeOnStart,
//   beginsPattern, endsPattern } }
// location is a group like "10", "10,5" or "10,5,10,8".

function run(definition: object, lines: string[], options = {}) {
  const matcher = new ProblemMatcher(definition, { workspaceFolder: "/p", ...options });
  for (const line of lines) matcher.processLine(line);
  return matcher.problems();
}

describe("single-line patterns", () => {
  const definition = {
    owner: "test",
    fileLocation: ["relative", "/p"],
    pattern: { regexp: "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$", file: 1, line: 2, column: 3, severity: 4, message: 5 },
  };

  it("maps groups to a problem", () => {
    expect(run(definition, ["src/a.c:10:5: error: bad thing"])).toEqual([
      {
        path: "/p/src/a.c",
        startLine: 9,
        startColumn: 4,
        severity: "error",
        message: "bad thing",
        owner: "test",
      },
    ]);
  });

  it("skips lines that don't match", () => {
    expect(run(definition, ["compiling...", "done"])).toEqual([]);
  });

  it("a location group sets line, column and end", () => {
    const problems = run(
      {
        owner: "t",
        fileLocation: "absolute",
        pattern: { regexp: "^(.*)\\((.*)\\): (.*)$", file: 1, location: 2, message: 3 },
      },
      ["/p/a.ts(10,5,10,8): oops", "/p/b.ts(3): line only"],
    );

    expect(problems[0]).toMatchObject({ startLine: 9, startColumn: 4, endLine: 9, endColumn: 7 });
    expect(problems[1]).toMatchObject({ startLine: 2, startColumn: 0 });
  });

  it("the matcher's severity is the default", () => {
    const problems = run(
      { owner: "t", fileLocation: "absolute", severity: "warning", pattern: { regexp: "^(.*): (.*)$", file: 1, message: 2 } },
      ["/p/a.ts: hmm"],
    );

    expect(problems[0].severity).eq("warning");
  });

  it("understands warn and info as severities", () => {
    const definitionWithWarn = {
      owner: "t",
      fileLocation: "absolute",
      pattern: { regexp: "^(.*): (\\w+): (.*)$", file: 1, severity: 2, message: 3 },
    };

    expect(run(definitionWithWarn, ["/p/a: warn: x", "/p/a: info: y"]).map((p: { severity: string }) => p.severity)).toEqual([
      "warning",
      "info",
    ]);
  });
});

describe("file locations", () => {
  const pattern = { regexp: "^(.*): (.*)$", file: 1, message: 2 };

  it("absolute keeps the path", () => {
    expect(run({ owner: "t", fileLocation: "absolute", pattern }, ["/x/a.ts: m"])[0].path).eq("/x/a.ts");
  });

  it("relative joins with the workspace folder", () => {
    expect(run({ owner: "t", fileLocation: "relative", pattern }, ["src/a.ts: m"])[0].path).eq("/p/src/a.ts");
  });

  it("autoDetect keeps absolute paths and joins relative ones", () => {
    const problems = run({ owner: "t", fileLocation: "autoDetect", pattern }, ["/x/a.ts: m", "b.ts: m"]);

    expect(problems.map((p: { path: string }) => p.path)).toEqual(["/x/a.ts", "/p/b.ts"]);
  });

  it("search looks for the file name under the include folders", () => {
    const problems = run(
      { owner: "t", fileLocation: ["search", { include: ["/p/src"] }], pattern },
      ["a.ts: m"],
      { exists: (path: string) => path === "/p/src/lib/a.ts", find: (folder: string, name: string) => (folder === "/p/src" && name === "a.ts" ? "/p/src/lib/a.ts" : undefined) },
    );

    expect(problems[0].path).eq("/p/src/lib/a.ts");
  });
});

describe("multi-line patterns", () => {
  const stylish = {
    owner: "eslint",
    fileLocation: "absolute",
    pattern: [
      { regexp: "^([^\\s].*)$", file: 1 },
      { regexp: "^\\s+(\\d+):(\\d+)\\s+(error|warning)\\s+(.*?)\\s\\s+(\\S+)$", line: 1, column: 2, severity: 3, message: 4, code: 5, loop: true },
    ],
  };

  it("reads several problems under one file line", () => {
    const problems = run(stylish, [
      "/p/a.js",
      "  1:5   error    'x' is not defined   no-undef",
      "  3:1   warning  Unexpected console   no-console",
      "",
      "/p/b.js",
      "  2:2   error    Missing semicolon    semi",
    ]);

    expect(problems.map((p: { path: string; startLine: number; code: string }) => [p.path, p.startLine, p.code])).toEqual([
      ["/p/a.js", 0, "no-undef"],
      ["/p/a.js", 2, "no-console"],
      ["/p/b.js", 1, "semi"],
    ]);
  });
});

describe("background matchers", () => {
  it("is active between the begins and ends patterns", () => {
    const matcher = new ProblemMatcher(
      {
        owner: "t",
        fileLocation: "absolute",
        pattern: { regexp: "^(.*): (.*)$", file: 1, message: 2 },
        background: { activeOnStart: false, beginsPattern: "^Starting", endsPattern: "^Done" },
      },
      { workspaceFolder: "/p" },
    );

    expect(matcher.isActive()).eq(false);
    matcher.processLine("Starting compilation");
    expect(matcher.isActive()).eq(true);
    matcher.processLine("/p/a.ts: broken");
    matcher.processLine("Done");
    expect(matcher.isActive()).eq(false);
    expect(matcher.problems()).toHaveLength(1);
  });

  it("a new cycle clears the problems of the last one", () => {
    const matcher = new ProblemMatcher(
      {
        owner: "t",
        fileLocation: "absolute",
        pattern: { regexp: "^(.*): (.*)$", file: 1, message: 2 },
        background: { activeOnStart: true, beginsPattern: "^Starting", endsPattern: "^Done" },
      },
      { workspaceFolder: "/p" },
    );
    matcher.processLine("/p/a.ts: broken");
    matcher.processLine("Done");

    matcher.processLine("Starting again");
    matcher.processLine("Done");

    expect(matcher.problems()).toEqual([]);
  });
});

describe("built-in matchers", () => {
  const builtIn = (name: string, lines: string[]) => {
    const matcher = builtInMatcher(name, { workspaceFolder: "/p" });
    for (const line of lines) matcher.processLine(line);
    return matcher;
  };

  it("$tsc", () => {
    const [problem] = builtIn("$tsc", ["src/a.ts(3,5): error TS2322: Type 'x' is wrong."]).problems();

    expect(problem).toMatchObject({ path: "/p/src/a.ts", startLine: 2, startColumn: 4, code: "TS2322", severity: "error" });
  });

  it("$tsc-watch tracks compile cycles", () => {
    const matcher = builtIn("$tsc-watch", ["[10:00:00 AM] File change detected. Starting incremental compilation..."]);
    expect(matcher.isActive()).eq(true);

    matcher.processLine("[10:00:01 AM] Found 0 errors. Watching for file changes.");
    expect(matcher.isActive()).eq(false);
  });

  it("$eslint-compact", () => {
    const [problem] = builtIn("$eslint-compact", ["/p/a.js: line 4, col 2, Error - 'y' is not defined. (no-undef)"]).problems();

    expect(problem).toMatchObject({ path: "/p/a.js", startLine: 3, startColumn: 1, severity: "error", code: "no-undef" });
  });

  it("$go", () => {
    const [problem] = builtIn("$go", ["main.go:10:5: undefined: x"]).problems();

    expect(problem).toMatchObject({ path: "/p/main.go", startLine: 9, startColumn: 4, message: "undefined: x" });
  });

  it("$mscompile", () => {
    const [problem] = builtIn("$mscompile", ["C:\\proj\\a.cs(10,5): error CS1002: ; expected [C:\\proj\\a.csproj]"]).problems();

    expect(problem).toMatchObject({ startLine: 9, startColumn: 4, code: "CS1002", severity: "error" });
  });
});
