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

const path = (ide: ReturnType<typeof code>) => ide.window().document.file.path();

describe("navigation history", () => {
  it("navigateBack returns to the previous editor", () => {
    const ide = code("|a", { path: "a.ts" });
    ide.openMemoryFile("b.ts", "b");

    ide.executeCommand("navigation.back");

    expect(path(ide)).eq("a.ts");
  });

  it("navigateForward goes forward again", () => {
    const ide = code("|a", { path: "a.ts" });
    ide.openMemoryFile("b.ts", "b");

    ide.executeCommand("navigation.back").executeCommand("navigation.forward");

    expect(path(ide)).eq("b.ts");
  });

  it("remembers big jumps inside a file", () => {
    const ide = code(lines(100)).executeCommand("textEditor.cursorBottom");

    ide.executeCommand("navigation.back");

    expect(ide.window().cursor().line).eq(0);
  });

  it("does not remember small moves", () => {
    const ide = code(lines(100)).executeCommand("textEditor.cursorDown").executeCommand("textEditor.cursorDown");

    ide.executeCommand("navigation.back");

    expect(ide.window().cursor().line).eq(2);
  });
});

describe("edit locations", () => {
  it("navigateToLastEditLocation goes back to where text was last changed", () => {
    const ide = code(lines(100), { path: "a.ts" });
    ide.window().cursor().line = 50;
    ide.type("X");
    ide.openMemoryFile("b.ts", "b");

    ide.executeCommand("navigation.lastEdit");

    expect(path(ide)).eq("a.ts");
    expect(ide.window().cursor().line).eq(50);
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
    const ide = code(lines(20), { path: "a.ts" });
    ide.diagnostics.set("a.ts", [at(5), at(10)]);

    ide.executeCommand("problems.next");

    expect(ide.window().cursor()).toMatchObject({ line: 5, column: 2 });
  });

  it("marker.next wraps around inside the file", () => {
    const ide = code(lines(20), { path: "a.ts" });
    ide.diagnostics.set("a.ts", [at(5)]);
    ide.window().cursor().line = 15;

    expect(ide.executeCommand("problems.next").window().cursor().line).eq(5);
  });

  it("marker.prev goes backwards", () => {
    const ide = code(lines(20), { path: "a.ts" });
    ide.diagnostics.set("a.ts", [at(5), at(10)]);
    ide.window().cursor().line = 12;

    expect(ide.executeCommand("problems.previous").window().cursor().line).eq(10);
  });

  it("marker.nextInFiles goes on to the next file with problems", () => {
    const ide = code(lines(20), { path: "a.ts" });
    ide.openMemoryFile("b.ts", lines(20));
    ide.openMemoryFile("a.ts", lines(20));
    ide.diagnostics.set("a.ts", [at(5)]);
    ide.diagnostics.set("b.ts", [at(3)]);
    ide.window().cursor().line = 10;

    ide.executeCommand("problems.nextInFiles");

    expect(path(ide)).eq("b.ts");
    expect(ide.window().cursor().line).eq(3);
  });
});

describe("changes", () => {
  it("nextChange goes to the next changed line", () => {
    const ide = code("|a\nX\nc\nd");
    ide.window().setDiffBase("a\nb\nc\nd");

    expect(ide.executeCommand("textEditor.nextChange").window().cursor().line).eq(1);
  });

  it("previousChange wraps around", () => {
    const ide = code("|a\nX\nc\nd");
    ide.window().setDiffBase("a\nb\nc\nd");

    expect(ide.executeCommand("textEditor.previousChange").window().cursor().line).eq(1);
  });
});
