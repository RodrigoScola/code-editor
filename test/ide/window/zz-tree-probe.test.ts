import { it, expect } from "vitest";
import { setupEditor } from "../../../src/Editor/setup/setupEditor.js";
import { WindowRenderer } from "../../../src/ui/Renderers/WindowRenderer.js";
import { FileTreeWindow } from "../../../src/Editor/windows/FileTree/FileTreeWindow.js";
import { WINDOW_NAMES } from "../../../src/constants.js";
import { CodeEditorGroup } from "../../../src/Editor/windows/Tab/TabWindow.js";
import { vim, workspace } from "../harness.js";
import { FakeWindow } from "./helpers.js";

// throwaway probe: delete me
it("tree rows show in a window", () => {
  const ide = vim("|abc");
  const window = new FakeWindow(800, 400);
  const renderer = new WindowRenderer(window);
  setupEditor.window.connect(ide, renderer);
  ide.setWorkspace(workspace({ "alpha.txt": "", "beta/b.txt": "" }));
  setupEditor.windows.fileTree(ide);
  const tree = ide.findWindow(FileTreeWindow)!;
  const primary = ide.rootWindow.findChildrenByName(WINDOW_NAMES.PRIMARY_WINDOW)!;
  primary.addChildren(tree);

  const screen = ide.screen().join("\n");
  console.log(JSON.stringify(tree.view().layout()), "\n" + screen);
  expect(screen).toContain("alpha.txt");
});

it("line numbers fit their gutter", () => {
  const text = Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n");
  const ide = vim("|" + text);
  const renderer = new WindowRenderer(new FakeWindow(800, 1000));
  setupEditor.window.connect(ide, renderer);
  const screen = ide.screen();
  const gutter = ide.rootWindow.findChildrenByName("editor_lines")!;
  const cw = gutter.charWidth();
  console.log(
    "gutter",
    JSON.stringify(gutter.contentLayout()),
    "charWidth",
    cw,
    "\n" + screen.slice(25, 35).join("\n"),
  );

  expect(gutter.contentLayout().width).toBeGreaterThanOrEqual(2 * cw);
  expect(screen.some((row) => row.startsWith("30 "))).eq(true);
});

it("the tab bar fits its titles' text in pixels", () => {
  const ide = vim("|abc");
  const renderer = new WindowRenderer(new FakeWindow(800, 400));
  setupEditor.window.connect(ide, renderer);
  ide.screen();
  const group = ide.findWindow(CodeEditorGroup)!;
  const bar = group.titles.layout();
  console.log("tab bar", JSON.stringify(bar), "\n" + ide.screen().join("\n"));

  // a 16px line plus its borders
  expect(bar.height).toBeGreaterThanOrEqual(16);
  expect(ide.screen().join("\n")).toContain("test.txt");
});
