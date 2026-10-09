import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileTreeWindow } from "../../../src/Editor/windows/FileTreeWindow.js";
import { code, workspace } from "../harness.js";

// Explorer commands that work on the active file (VS Code: copyFilePath,
// copyRelativeFilePath, workbench.files.action.showActiveFileInExplorer,
// explorer.autoReveal, workbench.files.action.compareFileWith /
// selectForCompare + compareFiles).
//
//   explorer.copyPath           the active file's full path -> clipboard
//   explorer.copyRelativePath   relative to the workspace folder
//     setting copy_relative_path_separator (explorer.copyRelativePathSeparator):
//     "auto" (the platform's), "/" or "\\"
//   explorer.revealActiveFile   opens the tree's folders down to the active
//     file and puts the tree's cursor on it
//   setting auto_reveal (explorer.autoReveal, default true): switching
//     tabs reveals the file in the tree; false leaves the tree alone
//   explorer.selectForCompare, then explorer.compareWithSelected: opens a
//     diff of the selected file (left) and the active file (right),
//     ctx.diffEditor() -> { original, modified } as in
//     test/ide/diff/diff-editor.test.ts
//
// The workspace folder comes from ctx.setWorkspace(path); the clipboard is
// ctx.clipboard.

const files = () =>
  workspace({
    "src/app/main.ts": "main",
    "src/app/util.ts": "util",
    "README.md": "readme",
  });

function opened(path: string, root: string) {
  const ide = code("|x", { path: "x.txt", width: 60, height: 20 });
  ide.setWorkspace(root);
  ide.openAndFocus(join(root, path));
  return ide;
}

describe("copying paths", () => {
  it("copyPath copies the full path", () => {
    const root = files();
    const ide = opened("src/app/main.ts", root);

    ide.executeCommand("explorer.copyPath");

    expect(ide.clipboard.readText()).eq(join(root, "src/app/main.ts"));
  });

  it("copyRelativePath copies the path inside the workspace", () => {
    const root = files();
    const ide = opened("src/app/main.ts", root).setting("copy_relative_path_separator", "/");

    ide.executeCommand("explorer.copyRelativePath");

    expect(ide.clipboard.readText()).eq("src/app/main.ts");
  });

  it("the separator can be a backslash", () => {
    const root = files();
    const ide = opened("src/app/main.ts", root).setting("copy_relative_path_separator", "\\");

    ide.executeCommand("explorer.copyRelativePath");

    expect(ide.clipboard.readText()).eq("src\\app\\main.ts");
  });

  it('"auto" uses the platform\'s separator', () => {
    const root = files();
    const ide = opened("src/app/main.ts", root).setting("copy_relative_path_separator", "auto");

    ide.executeCommand("explorer.copyRelativePath");

    expect(ide.clipboard.readText()).eq(join("src", "app", "main.ts"));
  });

  it("a file outside the workspace copies its full path as the relative one", () => {
    const root = files();
    const elsewhere = workspace({ "far.txt": "far" });
    const ide = code("|x", { path: "x.txt" });
    ide.setWorkspace(root);
    ide.openAndFocus(join(elsewhere, "far.txt"));

    ide.executeCommand("explorer.copyRelativePath");

    expect(ide.clipboard.readText()).eq(join(elsewhere, "far.txt"));
  });

  it("does nothing with no file open", () => {
    const ide = code("|x", { path: "x.txt" });
    ide.clipboard.writeText("before");
    ide.executeCommand("textEditor.newUntitledFile");

    ide.executeCommand("explorer.copyPath");

    expect(ide.clipboard.readText()).eq("before");
  });
});

describe("revealing the active file", () => {
  function withTree(root: string) {
    const ide = code("|x", { path: "x.txt", width: 60, height: 20 });
    ide.setWorkspace(root);
    const tree = new FileTreeWindow(root);
    ide.addSidebar(tree);
    return { ide, tree };
  }

  const selected = (tree: FileTreeWindow) => tree.at(tree.cursor().line)?.path;

  it("revealActiveFile opens the folders and selects the file", () => {
    const root = files();
    const { ide, tree } = withTree(root);
    ide.setting("auto_reveal", false);
    ide.openAndFocus(join(root, "src/app/util.ts"));

    ide.executeCommand("explorer.revealActiveFile");

    expect(selected(tree)).eq(join(root, "src/app/util.ts"));
  });

  it("auto_reveal follows the active file", () => {
    const root = files();
    const { ide, tree } = withTree(root);

    ide.openAndFocus(join(root, "src/app/main.ts"));

    expect(selected(tree)).eq(join(root, "src/app/main.ts"));
  });

  it("auto_reveal false leaves the tree where it was", () => {
    const root = files();
    const { ide, tree } = withTree(root);
    ide.setting("auto_reveal", false);
    const before = selected(tree);

    ide.openAndFocus(join(root, "src/app/main.ts"));

    expect(selected(tree)).eq(before);
  });

  it("revealing keeps focus in the editor", () => {
    const root = files();
    const { ide } = withTree(root);
    const editor = ide.openAndFocus(join(root, "README.md"));

    ide.executeCommand("explorer.revealActiveFile");

    expect(ide.getActiveWindow()).eq(editor);
  });
});

describe("comparing two files", () => {
  it("compares the selected file with the active one", () => {
    const root = files();
    const ide = opened("src/app/main.ts", root);
    ide.executeCommand("explorer.selectForCompare");
    ide.openAndFocus(join(root, "src/app/util.ts"));

    ide.executeCommand("explorer.compareWithSelected");

    // the selected file on the left (original), the active one on the right
    expect(ide.diffEditor()).toMatchObject({ original: "main", modified: "util" });
  });

  it("compareWithSelected does nothing until a file was selected", () => {
    const root = files();
    const ide = opened("src/app/main.ts", root);

    ide.executeCommand("explorer.compareWithSelected");

    expect(ide.diffEditor()).eq(undefined);
  });
});
