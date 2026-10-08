import { describe, expect, it } from "vitest";
import { DiagnosticsStore } from "../../../src/Lsp/diagnostics.js";
import { ProblemsView } from "../../../src/Workbench/problems.js";

// Proposed module src/Workbench/problems.ts: the Problems panel
// (Ctrl+Shift+M) over the diagnostics store from test/ide.
//   new ProblemsView(store)
//   view.groups() -> [{ path, problems }] files sorted by path, problems
//     by severity (errors first) then position
//   view.setFilter(text): words match message, source, code or path;
//     a glob ("**/*.ts") keeps matching files; "!" in front excludes
//     ("!**/test/**", "!deprecated")
//   view.setSeverities({ errors, warnings, infos })
//   view.setActiveFileOnly(path | null)
//   view.counts() -> { errors, warnings, infos } of what is shown
//   view.next(fromPath, fromPosition) -> the next problem in F8 order:
//     the rest of this file, then the next files by path, wrapping around

type Severity = "error" | "warning" | "info";

const problem = (line: number, severity: Severity, message: string, source = "ts") => ({
  range: { start: { line, character: 0 }, end: { line, character: 1 } },
  severity,
  message,
  source,
});

function setup() {
  const store = new DiagnosticsStore();
  store.set("/p/src/b.ts", [problem(3, "warning", "unused b"), problem(1, "error", "type error")]);
  store.set("/p/src/a.ts", [problem(5, "info", "consider const")]);
  store.set("/p/test/c.test.ts", [problem(0, "error", "deprecated api", "eslint")]);
  return new ProblemsView(store);
}

const flat = (view: ProblemsView) =>
  view.groups().flatMap((g: { problems: { message: string }[] }) => g.problems.map((p) => p.message));

describe("grouping and sorting", () => {
  it("groups by file, sorted by path", () => {
    expect(setup().groups().map((g: { path: string }) => g.path)).toEqual([
      "/p/src/a.ts",
      "/p/src/b.ts",
      "/p/test/c.test.ts",
    ]);
  });

  it("puts errors first inside a file", () => {
    expect(setup().groups()[1].problems.map((p: { message: string }) => p.message)).toEqual([
      "type error",
      "unused b",
    ]);
  });

  it("counts what is shown", () => {
    expect(setup().counts()).toEqual({ errors: 2, warnings: 1, infos: 1 });
  });
});

describe("filtering", () => {
  it("by text in the message", () => {
    const view = setup();
    view.setFilter("unused");

    expect(flat(view)).toEqual(["unused b"]);
  });

  it("by source", () => {
    const view = setup();
    view.setFilter("eslint");

    expect(flat(view)).toEqual(["deprecated api"]);
  });

  it("by a glob on the path", () => {
    const view = setup();
    view.setFilter("**/test/**");

    expect(flat(view)).toEqual(["deprecated api"]);
  });

  it("excluding with !", () => {
    const view = setup();
    view.setFilter("!**/test/**");

    expect(flat(view)).not.toContain("deprecated api");
  });

  it("by severity", () => {
    const view = setup();
    view.setSeverities({ errors: true, warnings: false, infos: false });

    expect(flat(view)).toEqual(["type error", "deprecated api"]);
  });

  it("active file only", () => {
    const view = setup();
    view.setActiveFileOnly("/p/src/a.ts");

    expect(flat(view)).toEqual(["consider const"]);
  });
});

describe("F8 order", () => {
  it("goes through the rest of the file first", () => {
    const view = setup();

    expect(view.next("/p/src/b.ts", { line: 0, character: 0 })?.message).eq("type error");
  });

  it("then the next file", () => {
    const view = setup();

    expect(view.next("/p/src/b.ts", { line: 5, character: 0 })?.path).eq("/p/test/c.test.ts");
  });

  it("wraps around to the first file", () => {
    const view = setup();

    expect(view.next("/p/test/c.test.ts", { line: 9, character: 0 })?.path).eq("/p/src/a.ts");
  });
});
