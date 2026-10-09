import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// The Open Editors view at the top of the Explorer. Proposed:
//   ctx.openEditors() -> [{ group: n, editors: [{ path, dirty, active }] }]
//     one entry per editor group, editors in tab order
// Commands from its toolbar and context menu:
//   workbench.action.files.saveAll         save every modified editor
//   workbench.action.closeAllEditors       close everything (modified
//                                          editors are kept, waiting for a
//                                          save decision)
//   workbench.files.action.closeEditor with { path } closes one

const view = (vs: ReturnType<typeof code>) => vs.ctx.openEditors();

describe("open editors", () => {
  it("lists the editors of each group with their state", () => {
    const vs = code("|a", { path: "a.ts" });
    vs.ide.open("b.ts", "b");
    vs.type("x");

    expect(view(vs)).toEqual([
      {
        group: 0,
        editors: [
          { path: "a.ts", dirty: false, active: false },
          { path: "b.ts", dirty: true, active: true },
        ],
      },
    ]);
  });

  it("lists each group separately", () => {
    const vs = code("|a", { path: "a.ts" }).run("workbench.action.splitEditor");

    expect(view(vs).map((g: { group: number }) => g.group)).toEqual([0, 1]);
  });

  it("saveAll saves every modified editor", () => {
    const vs = code("|a", { path: "a.ts" }).type("x");
    vs.ide.open("b.ts", "b");
    vs.type("y");

    vs.run("workbench.action.files.saveAll");

    expect(view(vs)[0].editors.every((e: { dirty: boolean }) => !e.dirty)).eq(true);
  });

  it("closeEditor closes one editor by path", () => {
    const vs = code("|a", { path: "a.ts" });
    vs.ide.open("b.ts", "b");

    vs.run("workbench.files.action.closeEditor", { path: "a.ts" });

    expect(view(vs)[0].editors.map((e: { path: string }) => e.path)).toEqual(["b.ts"]);
  });

  it("closeAllEditors keeps modified editors", () => {
    const vs = code("|a", { path: "a.ts" }).type("x");
    vs.ide.open("b.ts", "b");

    vs.run("workbench.action.closeAllEditors");

    expect(view(vs)[0].editors.map((e: { path: string }) => e.path)).toEqual(["a.ts"]);
  });
});
