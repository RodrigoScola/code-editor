import { describe, expect, it } from "vitest";
import { workspace } from "../../ide/harness.js";
import { code } from "../harness.js";

// Edge cases for Quick Open and the command palette (base spec:
// quick-open.test.ts). Commands can have a when clause (registered with
// { when }); the palette hides commands whose when clause is false in the
// current context. Items show the command's key binding (keybindingLabel).

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe("command palette", () => {
  it("hides commands whose when clause is false", () => {
    const vs = code("|");
    vs.ctx.commands.register({ id: "debug.only", title: "Debug: Step Over", when: "inDebugMode", run: () => {} });

    expect(labels(vs.ctx.quickOpen.query(">step over"))).toEqual([]);
  });

  it("shows the key binding next to a command", () => {
    const vs = code("|");
    vs.ctx.commands.register({ id: "x.save", title: "X: Save", keybinding: "ctrl+s", run: () => {} });

    expect(vs.ctx.quickOpen.query(">x: save")[0].keybindingLabel).eq("Ctrl+S");
  });

  it("matches on the command id too", () => {
    const vs = code("|");
    vs.ctx.commands.register({ id: "workbench.action.zzz", title: "Something Else", run: () => {} });

    expect(labels(vs.ctx.quickOpen.query(">workbench.action.zzz"))).toEqual(["Something Else"]);
  });
});

describe("files", () => {
  it("leaves out files hidden by files.exclude", () => {
    const root = workspace({ "a.ts": "", "a.log": "" });
    const vs = code("|").setting("files.exclude", { "**/*.log": true });
    vs.ctx.setWorkspace(root);

    expect(labels(vs.ctx.quickOpen.query("a."))).toEqual(["a.ts"]);
  });

  it("a query with a space matches both words anywhere in the path", () => {
    const root = workspace({ "src/ui/button.ts": "", "src/core/button.ts": "" });
    const vs = code("|");
    vs.ctx.setWorkspace(root);

    expect(vs.ctx.quickOpen.query("button ui").map((i: { description?: string }) => i.description)).toEqual([
      expect.stringContaining("ui"),
    ]);
  });

  it("a line number with no file name goes to that line in the current file", () => {
    const vs = code("a\nb\nc");

    vs.ctx.quickOpen.query(":2");
    vs.ctx.quickOpen.accept();

    expect(vs.window().cursor().line).eq(1);
  });
});
