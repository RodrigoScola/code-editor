import { describe, expect, it } from "vitest";
import { StatusBar } from "../../../src/Workbench/statusBar.js";
import { NotificationCenter } from "../../../src/Workbench/notifications.js";
import { OutputService } from "../../../src/Workbench/output.js";
import { ProblemsView } from "../../../src/Workbench/problems.js";
import { DiagnosticsStore } from "../../../src/Lsp/diagnostics.js";
import { tabLabels } from "../../../src/Workbench/editorLabels.js";
import { code } from "../harness.js";

// Edge cases for the workbench (base specs: editor-groups, tabs, quick-open,
// status-bar, notifications, layout, output, problems).

const tabs = (ide: ReturnType<typeof code>) => ide.editorGroups.groups()[0].editors;

describe("tabs", () => {
  it("opening a file that is already open just switches to it", () => {
    const ide = code("|", { path: "a.ts" });
    ide.editors.open("b.ts");
    ide.editors.open("a.ts");

    expect(tabs(ide)).toEqual(["a.ts", "b.ts"]);
  });

  it("a modified tab is never closed by the editor limit", () => {
    const ide = code("|", { path: "a.ts" })
      .setting("tab_limit_enabled", true)
      .setting("tab_limit", 1)
      .type("x");
    ide.editors.open("b.ts");

    expect(tabs(ide)).toEqual(["a.ts", "b.ts"]);
  });

  it("closing the active tab activates the most recently used one", () => {
    const ide = code("|", { path: "a.ts" });
    ide.editors.open("b.ts");
    ide.editors.open("c.ts");
    ide.editors.open("a.ts");
    ide.editors.open("c.ts");

    ide.executeCommand("tabs.close");

    expect(ide.window().document.file.path()).eq("a.ts");
  });

  it("reopenClosedEditor with nothing closed does nothing", () => {
    const ide = code("|", { path: "a.ts" }).executeCommand("tabs.reopenClosed");

    expect(tabs(ide)).toEqual(["a.ts"]);
  });

  it("three files with the same name each get a different description", () => {
    const labels = tabLabels(["/p/x/src/index.ts", "/p/y/src/index.ts", "/p/z/lib/index.ts"]);

    expect(new Set(labels.map((l: { description?: string }) => l.description)).size).eq(3);
  });
});

describe("editor groups", () => {
  it("splitting a modified editor shares its unsaved text", () => {
    const ide = code("|a", { path: "a.ts" }).type("X").executeCommand("window.splitEditorRight");

    expect(ide.lines()).toEqual(["Xa"]);
  });

  it("moving the only editor of a group to the next group when there is no next group makes one", () => {
    const ide = code("|", { path: "a.ts" }).executeCommand("window.moveTabToNextGroup");

    // the old group is left empty and closes (closeEmptyGroups)
    expect(ide.editorGroups.groups().map((g: { editors: string[] }) => g.editors)).toEqual([["a.ts"]]);
    expect(ide.editorGroups.activeGroupIndex()).eq(0);
  });
});

describe("status bar", () => {
  it("negative priorities go to the right of zero", () => {
    const bar = new StatusBar();
    bar.add({ id: "neg", text: "n", alignment: "left", priority: -5 });
    bar.add({ id: "zero", text: "z", alignment: "left", priority: 0 });

    expect(bar.left().map((i: { id: string }) => i.id)).toEqual(["zero", "neg"]);
  });

  it("with several cursors the count replaces Ln/Col", () => {
    const ide = code("|a\nb|");
    const texts = ide.statusBar.right().map((i: { text: string }) => i.text);

    expect(texts.some((t: string) => t.startsWith("Ln"))).eq(false);
    expect(texts).toContain("2 selections");
  });
});

describe("notifications", () => {
  it("an identical notification after the first was closed shows again", () => {
    const center = new NotificationCenter();
    center.notify({ severity: "info", message: "x" }).close();
    center.notify({ severity: "info", message: "x" });

    expect(center.all()).toHaveLength(1);
  });

  it("progress without a total has no percentage", () => {
    const center = new NotificationCenter();
    center.progress({ message: "Working" }).report(10);

    expect(center.all()[0].total).toBeUndefined();
  });
});

describe("output", () => {
  it("appendLine on a channel that ends without a newline starts a new line", () => {
    const channel = new OutputService().channel("x");
    channel.append("a");
    channel.appendLine("b");

    expect(channel.content()).eq("ab\n");
  });
});

describe("problems", () => {
  it("a file whose problems are all filtered out is not listed", () => {
    const store = new DiagnosticsStore();
    store.set("/p/a.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, severity: "info", message: "m" }]);
    const view = new ProblemsView(store);

    view.setSeverities({ errors: true, warnings: true, infos: false });

    expect(view.groups()).toEqual([]);
  });

  it("filtering is case-insensitive", () => {
    const store = new DiagnosticsStore();
    store.set("/p/a.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, severity: "error", message: "Type Error" }]);
    const view = new ProblemsView(store);

    view.setFilter("type error");

    expect(view.counts().errors).eq(1);
  });
});
