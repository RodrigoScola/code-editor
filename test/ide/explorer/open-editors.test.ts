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

const view = (ide: ReturnType<typeof code>) => ide.openEditors();

describe("open editors", () => {
  it("lists the editors of each group with their state", () => {
    const ide = code("|a", { path: "a.ts" });
    ide.openMemoryFile("b.ts", "b");
    ide.type("x");

    expect(view(ide)).toEqual([
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
    const ide = code("|a", { path: "a.ts" }).executeCommand("window.splitEditorRight");

    expect(view(ide).map((g: { group: number }) => g.group)).toEqual([0, 1]);
  });

  it("saveAll saves every modified editor", () => {
    const ide = code("|a", { path: "a.ts" }).type("x");
    ide.openMemoryFile("b.ts", "b");
    ide.type("y");

    ide.executeCommand("textEditor.saveAll");

    expect(view(ide)[0].editors.every((e: { dirty: boolean }) => !e.dirty)).eq(true);
  });

  it("closeEditor closes one editor by path", () => {
    const ide = code("|a", { path: "a.ts" });
    ide.openMemoryFile("b.ts", "b");

    ide.executeCommand("tabs.close", { path: "a.ts" });

    expect(view(ide)[0].editors.map((e: { path: string }) => e.path)).toEqual(["b.ts"]);
  });

  it("closeAllEditors keeps modified editors", () => {
    const ide = code("|a", { path: "a.ts" }).type("x");
    ide.openMemoryFile("b.ts", "b");

    ide.executeCommand("tabs.closeAll");

    expect(view(ide)[0].editors.map((e: { path: string }) => e.path)).toEqual(["a.ts"]);
  });
});
