import { describe, expect, it } from "vitest";
import { TestTree } from "../../../src/Testing/testModel.js";
import { parseLcov, displayedPercent } from "../../../src/Testing/coverage.js";
import { parseJUnit, parseTap } from "../../../src/Testing/reporters.js";

// Edge cases for testing (base specs: test-explorer, coverage, reporters).

describe("test tree", () => {
  it("a parent with no children has its own state", () => {
    const tree = new TestTree();
    tree.add({ id: "t", label: "t" });
    tree.setResult("t", "passed");

    expect(tree.state("t")).eq("passed");
  });

  it("a newer result replaces the old one", () => {
    const tree = new TestTree();
    tree.add({ id: "t", label: "t" });
    tree.setResult("t", "failed");
    tree.setResult("t", "passed");

    expect(tree.failedTests()).toEqual([]);
  });

  it("removing a test removes its children too", () => {
    const tree = new TestTree();
    tree.add({ id: "s", label: "s" });
    tree.add({ id: "t", label: "t", parentId: "s" });

    tree.remove("s");

    expect(tree.filter("t", {})).toEqual([]);
  });

  it("testAt picks the later of two tests on the same line range", () => {
    const tree = new TestTree();
    tree.add({ id: "a", label: "a", path: "/f", range: { start: 0, end: 5 } });
    tree.add({ id: "b", label: "b", path: "/f", range: { start: 0, end: 5 } });

    expect(tree.testAt("/f", 2)).eq("b");
  });

  it("filter text is case-insensitive", () => {
    const tree = new TestTree();
    tree.add({ id: "t", label: "Adds Numbers" });

    expect(tree.filter("adds", {})).toEqual(["t"]);
  });
});

describe("coverage", () => {
  it("a file with no functions or branches shows its line percent as the total", () => {
    const [file] = parseLcov("SF:/a.ts\nDA:1,1\nDA:2,0\nend_of_record\n");

    expect(displayedPercent(file, "totalCoverage")).toBeCloseTo(50);
  });

  it("a file with nothing to cover counts as 100%", () => {
    const [file] = parseLcov("SF:/a.ts\nend_of_record\n");

    expect(displayedPercent(file, "statement")).eq(100);
  });

  it("Windows paths in SF are kept", () => {
    expect(parseLcov("SF:C:\\p\\a.ts\nDA:1,1\nend_of_record\n")[0].path).eq("C:\\p\\a.ts");
  });

  it("the same file twice in one report is merged", () => {
    const files = parseLcov("SF:/a.ts\nDA:1,1\nend_of_record\nSF:/a.ts\nDA:2,1\nend_of_record\n");

    expect(files).toHaveLength(1);
    expect(files[0].summary.lines).toEqual({ covered: 2, total: 2 });
  });
});

describe("reporters", () => {
  it("JUnit with a single testsuite at the top", () => {
    expect(parseJUnit('<testsuite name="s"><testcase name="a"/></testsuite>')).toHaveLength(1);
  });

  it("JUnit failure text without a message attribute", () => {
    expect(parseJUnit('<testsuite><testcase name="a"><failure>details here</failure></testcase></testsuite>')[0].message).eq(
      "details here",
    );
  });

  it("TAP without a plan line", () => {
    expect(parseTap("ok 1 - a\nnot ok 2 - b").map((t: { status: string }) => t.status)).toEqual(["passed", "failed"]);
  });

  it("TAP Bail out! marks the run as aborted", () => {
    const results = parseTap("1..2\nok 1 - a\nBail out! database down");

    expect(results.at(-1)).toMatchObject({ status: "errored", message: "database down" });
  });
});
