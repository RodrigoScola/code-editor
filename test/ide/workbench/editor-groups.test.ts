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

const groups = (ide: ReturnType<typeof code>) =>
  ide.editorGroups.groups().map((g: { editors: string[] }) => g.editors);

function twoFiles() {
  const ide = code("|a", { path: "a.ts" });
  ide.openMemoryFile("b.ts", "b");
  return ide;
}

describe("splitting", () => {
  it("splitEditor opens the active file in a new group to the right", () => {
    const ide = code("|a", { path: "a.ts" }).executeCommand("window.splitEditorRight");

    expect(groups(ide)).toEqual([["a.ts"], ["a.ts"]]);
    expect(ide.editorGroups.orientation()).eq("horizontal");
    expect(ide.editorGroups.activeGroupIndex()).eq(1);
  });

  it("splitEditorDown stacks the groups", () => {
    const ide = code("|a", { path: "a.ts" }).executeCommand("window.splitEditorDown");

    expect(ide.editorGroups.orientation()).eq("vertical");
  });

  it("openSideBySideDirection down makes splitEditor stack too", () => {
    const ide = code("|a", { path: "a.ts" })
      .setting("split_direction", "down")
      .executeCommand("window.splitEditorRight");

    expect(ide.editorGroups.orientation()).eq("vertical");
  });
});

describe("moving editors between groups", () => {
  it("moveEditorToNextGroup makes a new group when there is none", () => {
    const ide = twoFiles().executeCommand("window.moveTabToNextGroup");

    expect(groups(ide)).toEqual([["a.ts"], ["b.ts"]]);
  });

  it("moveEditorToPreviousGroup moves it back and closes the empty group", () => {
    const ide = twoFiles()
      .executeCommand("window.moveTabToNextGroup")
      .executeCommand("window.moveTabToPreviousGroup");

    expect(groups(ide)).toEqual([["a.ts", "b.ts"]]);
  });

  it("joinTwoGroups merges the active group into the previous one", () => {
    const ide = twoFiles().executeCommand("window.moveTabToNextGroup").executeCommand("window.joinGroups");

    expect(groups(ide)).toEqual([["a.ts", "b.ts"]]);
  });
});

describe("focusing groups", () => {
  it("focusFirstEditorGroup and focusSecondEditorGroup", () => {
    const ide = twoFiles().executeCommand("window.moveTabToNextGroup");

    ide.executeCommand("window.focusGroup1");
    expect(ide.window().document.file.path()).eq("a.ts");

    ide.executeCommand("window.focusGroup2");
    expect(ide.window().document.file.path()).eq("b.ts");
  });
});

describe("closing", () => {
  it("closing the last editor of a group closes the group", () => {
    const ide = twoFiles()
      .executeCommand("window.moveTabToNextGroup")
      .executeCommand("tabs.close");

    expect(groups(ide)).toEqual([["a.ts"]]);
  });

  it("closeEmptyGroups false keeps the empty group", () => {
    const ide = twoFiles()
      .setting("close_empty_groups", false)
      .executeCommand("window.moveTabToNextGroup")
      .executeCommand("tabs.close");

    expect(groups(ide)).toEqual([["a.ts"], []]);
  });

  it("closeEditorsInGroup closes every editor in the active group", () => {
    const ide = twoFiles().executeCommand("window.splitEditorRight").executeCommand("tabs.closeGroup");

    expect(groups(ide)).toEqual([["a.ts", "b.ts"]]);
  });
});
