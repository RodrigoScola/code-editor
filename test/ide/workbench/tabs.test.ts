import { describe, expect, it } from "vitest";
import { customLabel, tabLabels } from "../../../src/Workbench/editorLabels.js";
import { code } from "../harness.js";

// Tabs in an editor group.
// Opening: ctx.editors.open(path, { preview? }) (proposed). A preview tab
// (workbench.editor.enablePreview, italic in VS Code) is replaced by the
// next preview; editing it or workbench.action.keepEditor makes it stay.
// Pinned tabs (workbench.action.pinEditor) move to the front and survive
// "close others". workbench.editor.openPositioning: "right" (after the
// active tab, default) | "left" | "first" | "last".
// Closing: workbench.action.closeOtherEditors, closeEditorsToTheRight,
// closeUnmodifiedEditors, closeAllEditors; reopenClosedEditor
// (Ctrl+Shift+T) brings back the last one at its old place.
// Ctrl+Tab order: workbench.action.openPreviousRecentlyUsedEditorInGroup.
// workbench.editor.limit.enabled / .value: too many tabs closes the least
// recently used unmodified one.
//
// Proposed src/Workbench/editorLabels.ts:
//   tabLabels(paths) -> [{ name, description }] where description is only
//     set when names repeat, and is enough of the folder to tell them apart
//   customLabel(path, patterns) -> label from
//     workbench.editor.customLabels.patterns, using ${filename} (no
//     extension), ${extname}, ${dirname}, ${dirname(N)}

const tabs = (ide: ReturnType<typeof code>) => ide.editorGroups.groups()[0].editors;

function opened(...paths: string[]) {
  const ide = code("|", { path: paths[0] });
  for (const path of paths.slice(1)) ide.editors.open(path);
  return ide;
}

describe("preview tabs", () => {
  it("a preview tab is replaced by the next preview", () => {
    const ide = opened("a.ts");
    ide.editors.open("b.ts", { preview: true });
    ide.editors.open("c.ts", { preview: true });

    expect(tabs(ide)).toEqual(["a.ts", "c.ts"]);
  });

  it("editing a preview tab keeps it", () => {
    const ide = opened("a.ts");
    ide.editors.open("b.ts", { preview: true });
    ide.type("x");
    ide.editors.open("c.ts", { preview: true });

    expect(tabs(ide)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("keepEditor keeps it", () => {
    const ide = opened("a.ts");
    ide.editors.open("b.ts", { preview: true });
    ide.executeCommand("tabs.keepOpen");
    ide.editors.open("c.ts", { preview: true });

    expect(tabs(ide)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("enablePreview false never makes preview tabs", () => {
    const ide = opened("a.ts").setting("preview_tabs", false);
    ide.editors.open("b.ts", { preview: true });
    ide.editors.open("c.ts", { preview: true });

    expect(tabs(ide)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });
});

describe("where new tabs go", () => {
  it("right of the active tab by default", () => {
    const ide = opened("a.ts", "b.ts", "c.ts");
    ide.editors.open("a.ts");
    ide.editors.open("d.ts");

    expect(tabs(ide)).toEqual(["a.ts", "d.ts", "b.ts", "c.ts"]);
  });

  it("last puts them at the end", () => {
    const ide = opened("a.ts", "b.ts").setting("tab_open_position", "last");
    ide.editors.open("a.ts");
    ide.editors.open("c.ts");

    expect(tabs(ide)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("first puts them at the start", () => {
    const ide = opened("a.ts", "b.ts").setting("tab_open_position", "first");
    ide.editors.open("c.ts");

    expect(tabs(ide)).toEqual(["c.ts", "a.ts", "b.ts"]);
  });
});

describe("pinned tabs", () => {
  it("pinEditor moves the tab to the front", () => {
    const ide = opened("a.ts", "b.ts", "c.ts").executeCommand("tabs.pin");

    expect(tabs(ide)).toEqual(["c.ts", "a.ts", "b.ts"]);
  });

  it("close others keeps pinned tabs", () => {
    const ide = opened("a.ts", "b.ts", "c.ts").executeCommand("tabs.pin");
    ide.editors.open("b.ts");

    ide.executeCommand("tabs.closeOthers");

    expect(tabs(ide)).toEqual(["c.ts", "b.ts"]);
  });
});

describe("closing tabs", () => {
  it("closeOtherEditors keeps only the active tab", () => {
    const ide = opened("a.ts", "b.ts", "c.ts");
    ide.editors.open("b.ts");

    expect(tabs(ide.executeCommand("tabs.closeOthers"))).toEqual(["b.ts"]);
  });

  it("closeEditorsToTheRight", () => {
    const ide = opened("a.ts", "b.ts", "c.ts");
    ide.editors.open("a.ts");

    expect(tabs(ide.executeCommand("tabs.closeToTheRight"))).toEqual(["a.ts"]);
  });

  it("closeUnmodifiedEditors keeps the modified ones", () => {
    const ide = opened("a.ts", "b.ts", "c.ts");
    ide.editors.open("b.ts");
    ide.type("x");

    expect(tabs(ide.executeCommand("tabs.closeSaved"))).toEqual(["b.ts"]);
  });

  it("reopenClosedEditor brings the last closed tab back where it was", () => {
    const ide = opened("a.ts", "b.ts", "c.ts");
    ide.editors.open("b.ts");
    ide.executeCommand("tabs.close");

    expect(tabs(ide.executeCommand("tabs.reopenClosed"))).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(ide.window().document.file.path()).eq("b.ts");
  });
});

describe("recently used order", () => {
  it("Ctrl+Tab goes to the previously used tab, not the neighbour", () => {
    const ide = opened("a.ts", "b.ts", "c.ts");
    ide.editors.open("a.ts");
    ide.editors.open("c.ts");

    ide.executeCommand("tabs.previousUsed");

    expect(ide.window().document.file.path()).eq("a.ts");
  });
});

describe("editor limit", () => {
  it("closes the least recently used tab when over the limit", () => {
    const ide = code("|", { path: "a.ts" })
      .setting("tab_limit_enabled", true)
      .setting("tab_limit", 2);
    ide.editors.open("b.ts");
    ide.editors.open("c.ts");

    expect(tabs(ide)).toEqual(["b.ts", "c.ts"]);
  });
});

describe("tab labels", () => {
  it("unique names have no description", () => {
    expect(tabLabels(["/p/src/a.ts", "/p/src/b.ts"])).toEqual([
      { name: "a.ts", description: undefined },
      { name: "b.ts", description: undefined },
    ]);
  });

  it("repeated names get enough of their folder to tell them apart", () => {
    const [a, b] = tabLabels(["/p/src/a/index.ts", "/p/src/b/index.ts"]);

    expect(a.name).eq("index.ts");
    expect(a.description).toContain("a");
    expect(b.description).toContain("b");
    expect(a.description).not.eq(b.description);
  });

  it("custom label patterns", () => {
    const patterns = { "**/index.ts": "${dirname}/index", "**/*.test.ts": "${filename} (test)" };

    expect(customLabel("/p/src/comp/index.ts", patterns)).eq("comp/index");
    expect(customLabel("/p/a.test.ts", patterns)).eq("a.test (test)");
    expect(customLabel("/p/other.ts", patterns)).toBeUndefined();
  });

  it("dirname(1) is the folder above the parent and extname is the extension", () => {
    expect(customLabel("/p/pkg/src/index.ts", { "**/*.ts": "${dirname(1)}-${extname}" })).eq("pkg-ts");
  });
});
