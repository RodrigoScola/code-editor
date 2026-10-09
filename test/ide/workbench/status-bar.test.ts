import { describe, expect, it } from "vitest";
import { StatusBar, parseIcons } from "../../../src/Workbench/statusBar.js";
import { code } from "../harness.js";

// Proposed module src/Workbench/statusBar.ts.
//   new StatusBar(); bar.add({ id, text, alignment: "left" | "right",
//     priority?, tooltip?, command? }) -> item; item.hide() / item.show()
//   bar.left() / bar.right() -> visible items in display order. In both
//     groups a higher priority sits further left (VS Code's rule).
//   parseIcons("$(error) 2") -> [{ icon: "error" }, { text: " 2" }]
//
// The editor's own items (ctx.statusBar), VS Code's wording:
//   "Ln 3, Col 5"           1-based, Col counts tabs as tabSize columns
//   "Ln 1, Col 4 (3 selected)"
//   "2 selections" / "2 selections (5 characters selected)"
//   "Spaces: 4" or "Tab Size: 4"
//   "UTF-8", "UTF-8 with BOM", "UTF-16 LE"
//   "LF" / "CRLF"
//   language name ("TypeScript", "Plain Text")

describe("StatusBar", () => {
  it("orders each side by priority, highest on the left", () => {
    const bar = new StatusBar();
    bar.add({ id: "a", text: "a", alignment: "left", priority: 1 });
    bar.add({ id: "b", text: "b", alignment: "left", priority: 10 });
    bar.add({ id: "c", text: "c", alignment: "right", priority: 5 });
    bar.add({ id: "d", text: "d", alignment: "right", priority: 50 });

    expect(bar.left().map((i: { id: string }) => i.id)).toEqual(["b", "a"]);
    expect(bar.right().map((i: { id: string }) => i.id)).toEqual(["d", "c"]);
  });

  it("keeps insertion order for equal priorities", () => {
    const bar = new StatusBar();
    bar.add({ id: "a", text: "a", alignment: "left" });
    bar.add({ id: "b", text: "b", alignment: "left" });

    expect(bar.left().map((i: { id: string }) => i.id)).toEqual(["a", "b"]);
  });

  it("hidden items are not shown", () => {
    const bar = new StatusBar();
    bar.add({ id: "a", text: "a", alignment: "left" }).hide();

    expect(bar.left()).toEqual([]);
  });

  it("parses $(icon) names out of the text", () => {
    expect(parseIcons("$(error) 2 $(warning) 1")).toEqual([
      { icon: "error" },
      { text: " 2 " },
      { icon: "warning" },
      { text: " 1" },
    ]);
  });
});

const items = (ide: ReturnType<typeof code>) =>
  [...ide.statusBar.left(), ...ide.statusBar.right()].map((i: { text: string }) => i.text);

describe("editor items", () => {
  it("cursor position", () => {
    expect(items(code("a\nb\nab|cd"))).toContain("Ln 3, Col 3");
  });

  it("selection size", () => {
    expect(items(code("«abc»d"))).toContain("Ln 1, Col 4 (3 selected)");
  });

  it("several cursors", () => {
    expect(items(code("a|b c|d"))).toContain("2 selections");
  });

  it("several selections with characters", () => {
    expect(items(code("«ab» «cde»"))).toContain("2 selections (5 characters selected)");
  });

  it("columns count tabs as their width", () => {
    expect(items(code("\t|x"))).toContain("Ln 1, Col 5");
  });

  it("indentation", () => {
    expect(items(code("|a"))).toContain("Spaces: 4");
    expect(items(code("|a").setting("expand_tab", false))).toContain("Tab Size: 4");
  });

  it("encoding and line endings", () => {
    const shown = items(code("|a"));

    expect(shown).toContain("UTF-8");
    expect(shown).toContain("LF");
  });

  it("language", () => {
    expect(items(code("|a", { path: "a.ts" }))).toContain("TypeScript");
    expect(items(code("|a", { path: "a.txt" }))).toContain("Plain Text");
  });
});
