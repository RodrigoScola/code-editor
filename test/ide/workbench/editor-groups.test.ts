import { describe, expect, it } from "vitest";
import { code } from "../harness.js";

// Editor groups: side by side editing.
//   workbench.action.splitEditor (Ctrl+\), splitEditorDown
//   workbench.action.moveEditorToNextGroup / moveEditorToPreviousGroup
//   workbench.action.focusFirstEditorGroup / focusSecondEditorGroup (Ctrl+1 / Ctrl+2)
//   workbench.action.joinTwoGroups, workbench.action.closeEditorsInGroup
//   workbench.action.closeActiveEditor (Ctrl+W)
// Settings: workbench.editor.closeEmptyGroups (true),
// workbench.editor.openSideBySideDirection ("right" | "down").
//
// Proposed model on ctx.editorGroups:
//   groups() -> [{ editors: paths in tab order, active: path | null }]
//   activeGroupIndex()
//   orientation() -> "horizontal" (side by side) | "vertical" (stacked)

const groups = (vs: ReturnType<typeof code>) =>
  vs.ctx.editorGroups.groups().map((g: { editors: string[] }) => g.editors);

function twoFiles() {
  const vs = code("|a", { path: "a.ts" });
  vs.ide.open("b.ts", "b");
  return vs;
}

describe("splitting", () => {
  it("splitEditor opens the active file in a new group to the right", () => {
    const vs = code("|a", { path: "a.ts" }).run("workbench.action.splitEditor");

    expect(groups(vs)).toEqual([["a.ts"], ["a.ts"]]);
    expect(vs.ctx.editorGroups.orientation()).eq("horizontal");
    expect(vs.ctx.editorGroups.activeGroupIndex()).eq(1);
  });

  it("splitEditorDown stacks the groups", () => {
    const vs = code("|a", { path: "a.ts" }).run("workbench.action.splitEditorDown");

    expect(vs.ctx.editorGroups.orientation()).eq("vertical");
  });

  it("openSideBySideDirection down makes splitEditor stack too", () => {
    const vs = code("|a", { path: "a.ts" })
      .setting("workbench.editor.openSideBySideDirection", "down")
      .run("workbench.action.splitEditor");

    expect(vs.ctx.editorGroups.orientation()).eq("vertical");
  });
});

describe("moving editors between groups", () => {
  it("moveEditorToNextGroup makes a new group when there is none", () => {
    const vs = twoFiles().run("workbench.action.moveEditorToNextGroup");

    expect(groups(vs)).toEqual([["a.ts"], ["b.ts"]]);
  });

  it("moveEditorToPreviousGroup moves it back and closes the empty group", () => {
    const vs = twoFiles()
      .run("workbench.action.moveEditorToNextGroup")
      .run("workbench.action.moveEditorToPreviousGroup");

    expect(groups(vs)).toEqual([["a.ts", "b.ts"]]);
  });

  it("joinTwoGroups merges the active group into the previous one", () => {
    const vs = twoFiles().run("workbench.action.moveEditorToNextGroup").run("workbench.action.joinTwoGroups");

    expect(groups(vs)).toEqual([["a.ts", "b.ts"]]);
  });
});

describe("focusing groups", () => {
  it("focusFirstEditorGroup and focusSecondEditorGroup", () => {
    const vs = twoFiles().run("workbench.action.moveEditorToNextGroup");

    vs.run("workbench.action.focusFirstEditorGroup");
    expect(vs.window().document.file.path()).eq("a.ts");

    vs.run("workbench.action.focusSecondEditorGroup");
    expect(vs.window().document.file.path()).eq("b.ts");
  });
});

describe("closing", () => {
  it("closing the last editor of a group closes the group", () => {
    const vs = twoFiles()
      .run("workbench.action.moveEditorToNextGroup")
      .run("workbench.action.closeActiveEditor");

    expect(groups(vs)).toEqual([["a.ts"]]);
  });

  it("closeEmptyGroups false keeps the empty group", () => {
    const vs = twoFiles()
      .setting("workbench.editor.closeEmptyGroups", false)
      .run("workbench.action.moveEditorToNextGroup")
      .run("workbench.action.closeActiveEditor");

    expect(groups(vs)).toEqual([["a.ts"], []]);
  });

  it("closeEditorsInGroup closes every editor in the active group", () => {
    const vs = twoFiles().run("workbench.action.splitEditor").run("workbench.action.closeEditorsInGroup");

    expect(groups(vs)).toEqual([["a.ts", "b.ts"]]);
  });
});
