import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Edge cases for navigation (base spec: navigation.test.ts).

const lines = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`).join("\n");
const path = (vs: ReturnType<typeof code>) => vs.window().document.file.path();

describe("navigation history", () => {
  it("navigateBack with no history does nothing", () => {
    const vs = code("a|b", { path: "a.ts" }).run("workbench.action.navigateBack");

    expect(vs.state()).eq("a|b");
  });

  it("a new jump after going back drops the forward history", () => {
    const vs = code("|a", { path: "a.ts" });
    vs.ide.open("b.ts", "b");
    vs.run("workbench.action.navigateBack");
    vs.ide.open("c.ts", "c");

    vs.run("workbench.action.navigateForward");

    expect(path(vs)).eq("c.ts");
  });

  it("goes back to the position in the file, not just the file", () => {
    const vs = code(lines(100), { path: "a.ts" });
    vs.window().cursor().line = 40;
    vs.ide.open("b.ts", "b");

    vs.run("workbench.action.navigateBack");

    expect(vs.window().cursor().line).eq(40);
  });

  it("reopens a file that was closed since", () => {
    const vs = code("|a", { path: "a.ts" });
    vs.ide.open("b.ts", "b");
    vs.run("workbench.action.closeActiveEditor");

    vs.run("workbench.action.navigateBack");

    expect(path(vs)).eq("b.ts");
  });
});

describe("edit locations", () => {
  it("navigateBackInEditLocations goes through earlier edits", () => {
    const vs = code(lines(100), { path: "a.ts" });
    vs.window().cursor().line = 10;
    vs.type("X");
    vs.window().cursor().line = 60;
    vs.type("Y");
    vs.run("cursorBottom");

    vs.run("workbench.action.navigateBackInEditLocations");
    expect(vs.window().cursor().line).eq(60);

    vs.run("workbench.action.navigateBackInEditLocations");
    expect(vs.window().cursor().line).eq(10);
  });
});

describe("problems", () => {
  const at = (line: number, character = 0) => ({
    range: { start: { line, character }, end: { line, character: character + 1 } },
    severity: "error" as const,
    message: `on ${line}`,
  });

  it("marker.next with two problems on one line goes to the second", () => {
    const vs = code(lines(5), { path: "a.ts" });
    vs.ctx.diagnostics.set("a.ts", [at(2, 0), at(2, 4)]);
    vs.window().cursor().line = 2;

    vs.run("editor.action.marker.next");

    expect(vs.window().cursor()).toMatchObject({ line: 2, column: 4 });
  });

  it("marker.next with no problems does nothing", () => {
    const vs = code("a|b", { path: "a.ts" });

    expect(vs.run("editor.action.marker.next").state()).eq("a|b");
  });

  it("marker.nextInFiles wraps from the last file to the first", () => {
    const vs = code(lines(5), { path: "a.ts" });
    vs.ide.open("b.ts", lines(5));
    vs.ctx.diagnostics.set("a.ts", [at(1)]);
    vs.ctx.diagnostics.set("b.ts", [at(1)]);
    vs.window().cursor().line = 3;

    vs.run("editor.action.marker.nextInFiles");

    expect(path(vs)).eq("a.ts");
  });
});
