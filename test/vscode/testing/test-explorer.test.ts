import { describe, expect, it } from "vitest";
import { TestTree } from "../../../src/Testing/testModel.js";

// The Test Explorer's model. Proposed src/Testing/testModel.ts:
//   tree.add({ id, label, parentId?, path?, range?: { start, end } lines,
//     tags?: string[] })
//   tree.setResult(id, state, { duration?, message?, expected?, actual? })
//     state: "queued" | "running" | "passed" | "failed" | "errored" |
//            "skipped" | "unset"
//   tree.state(id) -> a parent's state comes from its children, the most
//     important winning: running > errored > failed > queued > passed >
//     skipped > unset
//   tree.filter(text, { currentFile? }) -> ids shown:
//     words match labels; "!word" excludes; @failed, @executed (has a
//     result), @doc (in currentFile), @tag:<name>; parents of matches stay
//   tree.testAt(path, line) -> the innermost test whose range has the line
//     (Run Test at Cursor)
//   tree.failedTests() -> leaf tests that failed or errored (Rerun Failed)
//   tree.testsInFile(path) (continuous run: what to rerun when it changes)
//   tree.badge("failed" | "passed" | "skipped" | "off") -> the count
//   tree.message(id) -> { text, diff? } with expected/actual for a diff

function sample() {
  const tree = new TestTree();
  tree.add({ id: "file", label: "math.test.ts", path: "/p/math.test.ts", range: { start: 0, end: 30 } });
  tree.add({ id: "suite", label: "add", parentId: "file", path: "/p/math.test.ts", range: { start: 1, end: 20 } });
  tree.add({ id: "t1", label: "adds numbers", parentId: "suite", path: "/p/math.test.ts", range: { start: 2, end: 5 }, tags: ["fast"] });
  tree.add({ id: "t2", label: "adds strings", parentId: "suite", path: "/p/math.test.ts", range: { start: 6, end: 9 } });
  tree.add({ id: "t3", label: "subtracts", parentId: "file", path: "/p/math.test.ts", range: { start: 21, end: 25 }, tags: ["slow"] });
  tree.add({ id: "other", label: "io.test.ts", path: "/p/io.test.ts", range: { start: 0, end: 10 } });
  return tree;
}

describe("states", () => {
  it("a parent fails when a child fails", () => {
    const tree = sample();
    tree.setResult("t1", "passed");
    tree.setResult("t2", "failed");

    expect(tree.state("suite")).eq("failed");
    expect(tree.state("file")).eq("failed");
  });

  it("a running child makes the parent running", () => {
    const tree = sample();
    tree.setResult("t1", "failed");
    tree.setResult("t2", "running");

    expect(tree.state("suite")).eq("running");
  });

  it("errored beats failed", () => {
    const tree = sample();
    tree.setResult("t1", "errored");
    tree.setResult("t2", "failed");

    expect(tree.state("suite")).eq("errored");
  });

  it("all skipped is skipped, passed and skipped is passed", () => {
    const tree = sample();
    tree.setResult("t1", "skipped");
    tree.setResult("t2", "skipped");
    expect(tree.state("suite")).eq("skipped");

    tree.setResult("t2", "passed");
    expect(tree.state("suite")).eq("passed");
  });

  it("nothing run is unset", () => {
    expect(sample().state("file")).eq("unset");
  });
});

describe("filtering", () => {
  it("matches labels and keeps the parents", () => {
    expect(sample().filter("strings", {}).sort()).toEqual(["file", "suite", "t2"]);
  });

  it("!word excludes", () => {
    expect(sample().filter("!adds", {})).not.toContain("t1");
  });

  it("@failed shows failed tests", () => {
    const tree = sample();
    tree.setResult("t3", "failed");

    expect(tree.filter("@failed", {}).sort()).toEqual(["file", "t3"]);
  });

  it("@executed shows tests that have a result", () => {
    const tree = sample();
    tree.setResult("t1", "passed");

    expect(tree.filter("@executed", {}).sort()).toEqual(["file", "suite", "t1"]);
  });

  it("@doc shows tests in the current file", () => {
    expect(sample().filter("@doc", { currentFile: "/p/io.test.ts" })).toEqual(["other"]);
  });

  it("@tag:name shows tests with that tag", () => {
    expect(sample().filter("@tag:slow", {}).sort()).toEqual(["file", "t3"]);
  });
});

describe("finding tests", () => {
  it("testAt finds the innermost test around a line", () => {
    const tree = sample();

    expect(tree.testAt("/p/math.test.ts", 7)).eq("t2");
    expect(tree.testAt("/p/math.test.ts", 15)).eq("suite");
    expect(tree.testAt("/p/math.test.ts", 28)).eq("file");
  });

  it("failedTests lists failed and errored leaf tests", () => {
    const tree = sample();
    tree.setResult("t1", "failed");
    tree.setResult("t3", "errored");
    tree.setResult("t2", "passed");

    expect(tree.failedTests().sort()).toEqual(["t1", "t3"]);
  });

  it("testsInFile lists the tests to rerun when a file changes", () => {
    expect(sample().testsInFile("/p/io.test.ts")).toEqual(["other"]);
  });
});

describe("badge and messages", () => {
  it("counts failed, passed or skipped leaf tests", () => {
    const tree = sample();
    tree.setResult("t1", "failed");
    tree.setResult("t2", "passed");
    tree.setResult("t3", "passed");

    expect(tree.badge("failed")).eq(1);
    expect(tree.badge("passed")).eq(2);
    expect(tree.badge("off")).eq(0);
  });

  it("keeps the failure message with expected and actual for a diff", () => {
    const tree = sample();
    tree.setResult("t1", "failed", { message: "expected 3 to be 4", expected: "4", actual: "3" });

    expect(tree.message("t1")).toEqual({ text: "expected 3 to be 4", diff: { expected: "4", actual: "3" } });
  });
});
