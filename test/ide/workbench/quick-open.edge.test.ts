import { describe, expect, it } from "vitest";
import { workspace } from "../harness.js";
import { code } from "../harness.js";

// Edge cases for Quick Open and the command palette (base spec:
// quick-open.test.ts). Commands can have a when clause (registered with
// { when }); the palette hides commands whose when clause is false in the
// current context. Items show the command's key binding (keybindingLabel).

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe("command palette", () => {
  it("hides commands whose when clause is false", () => {
    const ide = code("|");
    ide.commands.register({ id: "debug.only", title: "Debug: Step Over", when: "inDebugMode", run: () => {} });

    expect(labels(ide.quickOpen.query(">step over"))).toEqual([]);
  });

  it("shows the key binding next to a command", () => {
    const ide = code("|");
    ide.commands.register({ id: "x.save", title: "X: Save", keybinding: "ctrl+s", run: () => {} });

    expect(ide.quickOpen.query(">x: save")[0].keybindingLabel).eq("Ctrl+S");
  });

  it("matches on the command id too", () => {
    const ide = code("|");
    ide.commands.register({ id: "workbench.action.zzz", title: "Something Else", run: () => {} });

    expect(labels(ide.quickOpen.query(">workbench.action.zzz"))).toEqual(["Something Else"]);
  });
});

describe("files", () => {
  it("leaves out files hidden by files.exclude", () => {
    const root = workspace({ "a.ts": "", "a.log": "" });
    const ide = code("|").setting("files_exclude", { "**/*.log": true });
    ide.setWorkspace(root);

    expect(labels(ide.quickOpen.query("a."))).toEqual(["a.ts"]);
  });

  it("a query with a space matches both words anywhere in the path", () => {
    const root = workspace({ "src/ui/button.ts": "", "src/core/button.ts": "" });
    const ide = code("|");
    ide.setWorkspace(root);

    expect(ide.quickOpen.query("button ui").map((i: { description?: string }) => i.description)).toEqual([
      expect.stringContaining("ui"),
    ]);
  });

  it("a line number with no file name goes to that line in the current file", () => {
    const ide = code("a\nb\nc");

    ide.quickOpen.query(":2");
    ide.quickOpen.accept();

    expect(ide.window().cursor().line).eq(1);
  });
});
