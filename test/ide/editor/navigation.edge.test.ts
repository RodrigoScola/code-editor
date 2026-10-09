import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Edge cases for navigation (base spec: navigation.test.ts).

const lines = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");
const path = (ide: ReturnType<typeof code>) => ide.window().document.file.path();

describe("navigation history", () => {
  it("navigateBack with no history does nothing", () => {
    const ide = code("a|b", { path: "a.ts" }).executeCommand("navigation.back");

    expect(ide.state()).eq("a|b");
  });

  it("a new jump after going back drops the forward history", () => {
    const ide = code("|a", { path: "a.ts" });
    ide.openMemoryFile("b.ts", "b");
    ide.executeCommand("navigation.back");
    ide.openMemoryFile("c.ts", "c");

    ide.executeCommand("navigation.forward");

    expect(path(ide)).eq("c.ts");
  });

  it("goes back to the position in the file, not just the file", () => {
    const ide = code(lines(100), { path: "a.ts" });
    ide.window().cursor().line = 40;
    ide.openMemoryFile("b.ts", "b");

    ide.executeCommand("navigation.back");

    expect(ide.window().cursor().line).eq(40);
  });

  it("reopens a file that was closed since", () => {
    const ide = code("|a", { path: "a.ts" });
    ide.openMemoryFile("b.ts", "b");
    ide.executeCommand("tabs.close");

    ide.executeCommand("navigation.back");

    expect(path(ide)).eq("b.ts");
  });
});

describe("edit locations", () => {
  it("navigateBackInEditLocations goes through earlier edits", () => {
    const ide = code(lines(100), { path: "a.ts" });
    ide.window().cursor().line = 10;
    ide.type("X");
    ide.window().cursor().line = 60;
    ide.type("Y");
    ide.executeCommand("textEditor.cursorBottom");

    ide.executeCommand("navigation.backInEdits");
    expect(ide.window().cursor().line).eq(60);

    ide.executeCommand("navigation.backInEdits");
    expect(ide.window().cursor().line).eq(10);
  });
});

describe("problems", () => {
  const at = (line: number, character = 0) => ({
    range: { start: { line, character }, end: { line, character: character + 1 } },
    severity: "error" as const,
    message: `on ${line}`,
  });

  it("marker.next with two problems on one line goes to the second", () => {
    const ide = code(lines(5), { path: "a.ts" });
    ide.diagnostics.set("a.ts", [at(2, 0), at(2, 4)]);
    ide.window().cursor().line = 2;

    ide.executeCommand("problems.next");

    expect(ide.window().cursor()).toMatchObject({ line: 2, column: 4 });
  });

  it("marker.next with no problems does nothing", () => {
    const ide = code("a|b", { path: "a.ts" });

    expect(ide.executeCommand("problems.next").state()).eq("a|b");
  });

  it("marker.nextInFiles wraps from the last file to the first", () => {
    const ide = code(lines(5), { path: "a.ts" });
    ide.openMemoryFile("b.ts", lines(5));
    ide.diagnostics.set("a.ts", [at(1)]);
    ide.diagnostics.set("b.ts", [at(1)]);
    ide.window().cursor().line = 3;

    ide.executeCommand("problems.nextInFiles");

    expect(path(ide)).eq("a.ts");
  });
});
