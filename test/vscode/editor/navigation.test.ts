import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Moving around the workbench, VS Code style.
//   workbench.action.navigateBack / navigateForward       Alt+Left / Alt+Right
//     goes through editor switches and big cursor jumps (more than a
//     screen away), across files
//   workbench.action.navigateToLastEditLocation           Ctrl+K Ctrl+Q
//   workbench.action.navigateBackInEditLocations
//   editor.action.marker.next / prev                     F8 / Shift+F8 (Alt+F8)
//     next problem in this file, wrapping around
//   editor.action.marker.nextInFiles / prevInFiles       next problem anywhere
//   workbench.action.editor.nextChange / previousChange  Alt+F3 / Shift+Alt+F3
// Problems come from ctx.diagnostics (test/ide/language/diagnostics.test.ts),
// changes from codeWindow.setDiffBase (test/ide/tools/git-gutter.test.ts).

const lines = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");

const path = (vs: ReturnType<typeof code>) => vs.window().document.file.path();

describe("navigation history", () => {
  it("navigateBack returns to the previous editor", () => {
    const vs = code("|a", { path: "a.ts" });
    vs.ide.open("b.ts", "b");

    vs.run("workbench.action.navigateBack");

    expect(path(vs)).eq("a.ts");
  });

  it("navigateForward goes forward again", () => {
    const vs = code("|a", { path: "a.ts" });
    vs.ide.open("b.ts", "b");

    vs.run("workbench.action.navigateBack").run("workbench.action.navigateForward");

    expect(path(vs)).eq("b.ts");
  });

  it("remembers big jumps inside a file", () => {
    const vs = code(lines(100)).run("cursorBottom");

    vs.run("workbench.action.navigateBack");

    expect(vs.window().cursor().line).eq(0);
  });

  it("does not remember small moves", () => {
    const vs = code(lines(100)).run("cursorDown").run("cursorDown");

    vs.run("workbench.action.navigateBack");

    expect(vs.window().cursor().line).eq(2);
  });
});

describe("edit locations", () => {
  it("navigateToLastEditLocation goes back to where text was last changed", () => {
    const vs = code(lines(100), { path: "a.ts" });
    vs.window().cursor().line = 50;
    vs.type("X");
    vs.ide.open("b.ts", "b");

    vs.run("workbench.action.navigateToLastEditLocation");

    expect(path(vs)).eq("a.ts");
    expect(vs.window().cursor().line).eq(50);
  });
});

describe("problems", () => {
  type Severity = "error" | "warning";
  const at = (line: number, severity: Severity = "error") => ({
    range: { start: { line, character: 2 }, end: { line, character: 3 } },
    severity,
    message: `problem on ${line}`,
  });

  it("marker.next goes to the next problem in the file", () => {
    const vs = code(lines(20), { path: "a.ts" });
    vs.ctx.diagnostics.set("a.ts", [at(5), at(10)]);

    vs.run("editor.action.marker.next");

    expect(vs.window().cursor()).toMatchObject({ line: 5, column: 2 });
  });

  it("marker.next wraps around inside the file", () => {
    const vs = code(lines(20), { path: "a.ts" });
    vs.ctx.diagnostics.set("a.ts", [at(5)]);
    vs.window().cursor().line = 15;

    expect(vs.run("editor.action.marker.next").window().cursor().line).eq(5);
  });

  it("marker.prev goes backwards", () => {
    const vs = code(lines(20), { path: "a.ts" });
    vs.ctx.diagnostics.set("a.ts", [at(5), at(10)]);
    vs.window().cursor().line = 12;

    expect(vs.run("editor.action.marker.prev").window().cursor().line).eq(10);
  });

  it("marker.nextInFiles goes on to the next file with problems", () => {
    const vs = code(lines(20), { path: "a.ts" });
    vs.ide.open("b.ts", lines(20));
    vs.ide.open("a.ts", lines(20));
    vs.ctx.diagnostics.set("a.ts", [at(5)]);
    vs.ctx.diagnostics.set("b.ts", [at(3)]);
    vs.window().cursor().line = 10;

    vs.run("editor.action.marker.nextInFiles");

    expect(path(vs)).eq("b.ts");
    expect(vs.window().cursor().line).eq(3);
  });
});

describe("changes", () => {
  it("nextChange goes to the next changed line", () => {
    const vs = code("|a\nX\nc\nd");
    vs.window().setDiffBase("a\nb\nc\nd");

    expect(vs.run("workbench.action.editor.nextChange").window().cursor().line).eq(1);
  });

  it("previousChange wraps around", () => {
    const vs = code("|a\nX\nc\nd");
    vs.window().setDiffBase("a\nb\nc\nd");

    expect(vs.run("workbench.action.editor.previousChange").window().cursor().line).eq(1);
  });
});
