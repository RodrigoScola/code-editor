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

const tabs = (vs: ReturnType<typeof code>) => vs.ctx.editorGroups.groups()[0].editors;

function opened(...paths: string[]) {
  const vs = code("|", { path: paths[0] });
  for (const path of paths.slice(1)) vs.ctx.editors.open(path);
  return vs;
}

describe("preview tabs", () => {
  it("a preview tab is replaced by the next preview", () => {
    const vs = opened("a.ts");
    vs.ctx.editors.open("b.ts", { preview: true });
    vs.ctx.editors.open("c.ts", { preview: true });

    expect(tabs(vs)).toEqual(["a.ts", "c.ts"]);
  });

  it("editing a preview tab keeps it", () => {
    const vs = opened("a.ts");
    vs.ctx.editors.open("b.ts", { preview: true });
    vs.type("x");
    vs.ctx.editors.open("c.ts", { preview: true });

    expect(tabs(vs)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("keepEditor keeps it", () => {
    const vs = opened("a.ts");
    vs.ctx.editors.open("b.ts", { preview: true });
    vs.run("workbench.action.keepEditor");
    vs.ctx.editors.open("c.ts", { preview: true });

    expect(tabs(vs)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("enablePreview false never makes preview tabs", () => {
    const vs = opened("a.ts").setting("workbench.editor.enablePreview", false);
    vs.ctx.editors.open("b.ts", { preview: true });
    vs.ctx.editors.open("c.ts", { preview: true });

    expect(tabs(vs)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });
});

describe("where new tabs go", () => {
  it("right of the active tab by default", () => {
    const vs = opened("a.ts", "b.ts", "c.ts");
    vs.ctx.editors.open("a.ts");
    vs.ctx.editors.open("d.ts");

    expect(tabs(vs)).toEqual(["a.ts", "d.ts", "b.ts", "c.ts"]);
  });

  it("last puts them at the end", () => {
    const vs = opened("a.ts", "b.ts").setting("workbench.editor.openPositioning", "last");
    vs.ctx.editors.open("a.ts");
    vs.ctx.editors.open("c.ts");

    expect(tabs(vs)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("first puts them at the start", () => {
    const vs = opened("a.ts", "b.ts").setting("workbench.editor.openPositioning", "first");
    vs.ctx.editors.open("c.ts");

    expect(tabs(vs)).toEqual(["c.ts", "a.ts", "b.ts"]);
  });
});

describe("pinned tabs", () => {
  it("pinEditor moves the tab to the front", () => {
    const vs = opened("a.ts", "b.ts", "c.ts").run("workbench.action.pinEditor");

    expect(tabs(vs)).toEqual(["c.ts", "a.ts", "b.ts"]);
  });

  it("close others keeps pinned tabs", () => {
    const vs = opened("a.ts", "b.ts", "c.ts").run("workbench.action.pinEditor");
    vs.ctx.editors.open("b.ts");

    vs.run("workbench.action.closeOtherEditors");

    expect(tabs(vs)).toEqual(["c.ts", "b.ts"]);
  });
});

describe("closing tabs", () => {
  it("closeOtherEditors keeps only the active tab", () => {
    const vs = opened("a.ts", "b.ts", "c.ts");
    vs.ctx.editors.open("b.ts");

    expect(tabs(vs.run("workbench.action.closeOtherEditors"))).toEqual(["b.ts"]);
  });

  it("closeEditorsToTheRight", () => {
    const vs = opened("a.ts", "b.ts", "c.ts");
    vs.ctx.editors.open("a.ts");

    expect(tabs(vs.run("workbench.action.closeEditorsToTheRight"))).toEqual(["a.ts"]);
  });

  it("closeUnmodifiedEditors keeps the modified ones", () => {
    const vs = opened("a.ts", "b.ts", "c.ts");
    vs.ctx.editors.open("b.ts");
    vs.type("x");

    expect(tabs(vs.run("workbench.action.closeUnmodifiedEditors"))).toEqual(["b.ts"]);
  });

  it("reopenClosedEditor brings the last closed tab back where it was", () => {
    const vs = opened("a.ts", "b.ts", "c.ts");
    vs.ctx.editors.open("b.ts");
    vs.run("workbench.action.closeActiveEditor");

    expect(tabs(vs.run("workbench.action.reopenClosedEditor"))).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(vs.window().document.file.path()).eq("b.ts");
  });
});

describe("recently used order", () => {
  it("Ctrl+Tab goes to the previously used tab, not the neighbour", () => {
    const vs = opened("a.ts", "b.ts", "c.ts");
    vs.ctx.editors.open("a.ts");
    vs.ctx.editors.open("c.ts");

    vs.run("workbench.action.openPreviousRecentlyUsedEditorInGroup");

    expect(vs.window().document.file.path()).eq("a.ts");
  });
});

describe("editor limit", () => {
  it("closes the least recently used tab when over the limit", () => {
    const vs = code("|", { path: "a.ts" })
      .setting("workbench.editor.limit.enabled", true)
      .setting("workbench.editor.limit.value", 2);
    vs.ctx.editors.open("b.ts");
    vs.ctx.editors.open("c.ts");

    expect(tabs(vs)).toEqual(["b.ts", "c.ts"]);
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
