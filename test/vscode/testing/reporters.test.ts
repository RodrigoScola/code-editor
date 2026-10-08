import { describe, expect, it } from "vitest";
import { parseJUnit, parseTap, parseVitestJson } from "../../../src/Testing/reporters.js";

// Reading test results from tools that don't talk to the editor directly.
// Proposed src/Testing/reporters.ts, each returning
//   [{ name, suite?, path?, status: "passed" | "failed" | "skipped" |
//      "errored" | "todo", message?, duration? (ms) }]
//   parseJUnit(xml)          JUnit XML (testsuite / testcase / failure /
//                            error / skipped, time in seconds)
//   parseTap(text)           TAP 13 (ok / not ok, # SKIP, # TODO, YAML block)
//   parseVitestJson(json)    Vitest/Jest --reporter=json

describe("parseJUnit", () => {
  const xml = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="math" tests="4">
    <testcase name="adds" classname="math" time="0.012"/>
    <testcase name="divides" classname="math" time="0.5">
      <failure message="expected 1 &lt; 2">stack trace</failure>
    </testcase>
    <testcase name="later" classname="math"><skipped/></testcase>
    <testcase name="crashes" classname="math"><error message="boom"/></testcase>
  </testsuite>
</testsuites>`;

  it("reads each test case", () => {
    expect(parseJUnit(xml).map((t: { name: string; status: string }) => [t.name, t.status])).toEqual([
      ["adds", "passed"],
      ["divides", "failed"],
      ["later", "skipped"],
      ["crashes", "errored"],
    ]);
  });

  it("keeps the suite, the time in ms and the decoded message", () => {
    expect(parseJUnit(xml)[1]).toMatchObject({ suite: "math", duration: 500, message: "expected 1 < 2" });
  });
});

describe("parseTap", () => {
  const tap = [
    "TAP version 13",
    "1..4",
    "ok 1 - adds",
    "not ok 2 - divides",
    "  ---",
    "  message: 'expected 1'",
    "  ...",
    "ok 3 - later # SKIP not ready",
    "not ok 4 - someday # TODO write it",
  ].join("\n");

  it("reads statuses", () => {
    expect(parseTap(tap).map((t: { name: string; status: string }) => [t.name, t.status])).toEqual([
      ["adds", "passed"],
      ["divides", "failed"],
      ["later", "skipped"],
      ["someday", "todo"],
    ]);
  });

  it("reads the message from the YAML block", () => {
    expect(parseTap(tap)[1].message).eq("expected 1");
  });
});

describe("parseVitestJson", () => {
  const json = JSON.stringify({
    testResults: [
      {
        name: "/p/math.test.ts",
        assertionResults: [
          { ancestorTitles: ["math"], title: "adds", status: "passed", duration: 3, failureMessages: [] },
          { ancestorTitles: ["math", "division"], title: "by zero", status: "failed", duration: 4, failureMessages: ["AssertionError: boom\n at x"] },
          { ancestorTitles: [], title: "later", status: "skipped", failureMessages: [] },
        ],
      },
    ],
  });

  it("reads each test with its file and suites", () => {
    expect(parseVitestJson(json)[1]).toMatchObject({
      name: "by zero",
      suite: "math > division",
      path: "/p/math.test.ts",
      status: "failed",
      duration: 4,
      message: "AssertionError: boom",
    });
  });

  it("maps skipped tests", () => {
    expect(parseVitestJson(json)[2].status).eq("skipped");
  });
});
