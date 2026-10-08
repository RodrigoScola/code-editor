import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { vim, workspace } from "../harness.js";

// One tab per open file (VS Code style; in Vim terms, one per buffer).
//   gt / gT       next / previous tab, wrapping around
//   {n}gt         tab number n
//   :bd           close the current tab (refuses with unsaved changes)
// Each tab keeps its own cursor. A modified file's tab is marked with "+".

function twoTabs() {
  const ide = vim("a|bc", { path: "a.txt", width: 60, height: 12 });
  ide.open("b.txt", "bee");
  return ide;
}

const activeName = (ide: ReturnType<typeof vim>) =>
  ide.window().document.file.path();

describe("tabs", () => {
  it("opening a file adds a tab and focuses it", () => {
    const root = workspace({ "c.txt": "see" });
    const ide = vim("|a");

    ide.openFile(join(root, "c.txt"));

    expect(ide.group.management.all()).length(2);
    expect(activeName(ide)).eq(join(root, "c.txt"));
  });

  it("gt goes to the next tab and wraps around", () => {
    const ide = twoTabs();

    expect(activeName(ide.keys("gt"))).eq("a.txt");
    expect(activeName(ide.keys("gt"))).eq("b.txt");
  });

  it("gT goes to the previous tab", () => {
    expect(activeName(twoTabs().keys("gT"))).eq("a.txt");
  });

  it("{n}gt goes to tab n", () => {
    expect(activeName(twoTabs().keys("1gt"))).eq("a.txt");
  });

  it("each tab keeps its own cursor", () => {
    const ide = twoTabs().keys("gt");

    expect(ide.text()).eq("a|bc");
  });

  it(":bd closes the tab and focuses the one next to it", () => {
    const ide = twoTabs().keys(":bd<CR>");

    expect(ide.group.management.all()).length(1);
    expect(activeName(ide)).eq("a.txt");
  });

  it(":bd refuses to close a tab with unsaved changes", () => {
    const ide = twoTabs().keys("iX<Esc>:bd<CR>");

    expect(ide.group.management.all()).length(2);
    expect(ide.statusLine()).toContain("No write since last change");
  });

  it("the tab of a modified file is marked with +", () => {
    const ide = twoTabs();
    const tabRow = () => ide.screen().find((row) => row.includes("b.txt")) ?? "";

    expect(tabRow()).not.toContain("+");
    ide.keys("iX<Esc>");
    expect(tabRow()).toContain("+");
  });
});
