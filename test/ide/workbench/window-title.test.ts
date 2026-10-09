import { describe, expect, it } from "vitest";
import { DEFAULT_TITLE, windowTitle } from "../../../src/Workbench/windowTitle.js";

// The terminal title (VS Code: window.title and window.titleSeparator).
// In a terminal it is set with OSC 2 ("\x1b]2;<title>\x07").
//
// Proposed src/Workbench/windowTitle.ts:
//   windowTitle(template, state, separator = " - ") -> string
//     state: {
//       activeFile?: string             full path of the active editor
//       untitledName?: string           "Untitled-1" when it is untitled
//       dirty?: boolean
//       folders: { name, path }[]       workspace folders (one for a folder)
//       workspaceName?: string          set for a .code-workspace
//       appName: string
//       profileName?: string            left out for the default profile
//       repository?: { name, branch }
//     }
//   DEFAULT_TITLE =
//     "${dirty}${activeEditorShort}${separator}${rootName}${separator}${profileName}${separator}${appName}"
//
// Variables:
//   ${activeEditorShort}   file name                          a.ts
//   ${activeEditorMedium}  path relative to its folder        src/a.ts
//   ${activeEditorLong}    full path                          /work/app/src/a.ts
//   ${activeFolderShort}   name of the file's folder          src
//   ${activeFolderMedium}  that folder relative to its root   src
//   ${activeFolderLong}    full path of the file's folder
//   ${folderName} / ${folderPath}   the workspace folder holding the file
//   ${rootName} / ${rootPath}       the workspace (or the single folder)
//   ${appName} ${profileName} ${activeRepositoryName} ${activeRepositoryBranchName}
//   ${dirty}       "● " when the active editor has unsaved changes
//   ${separator}   the separator, only between two parts that have text
// Unknown variables are left out. Paths use "/" in the title.

const folder = { name: "app", path: "/work/app" };

const state = (overrides: Record<string, unknown> = {}) => ({
  activeFile: "/work/app/src/a.ts",
  folders: [folder],
  appName: "Editor",
  ...overrides,
});

describe("variables", () => {
  it.each([
    ["${activeEditorShort}", "a.ts"],
    ["${activeEditorMedium}", "src/a.ts"],
    ["${activeEditorLong}", "/work/app/src/a.ts"],
    ["${activeFolderShort}", "src"],
    ["${activeFolderMedium}", "src"],
    ["${activeFolderLong}", "/work/app/src"],
    ["${folderName}", "app"],
    ["${folderPath}", "/work/app"],
    ["${rootName}", "app"],
    ["${rootPath}", "/work/app"],
    ["${appName}", "Editor"],
  ])("%s", (template, expected) => {
    expect(windowTitle(template, state())).eq(expected);
  });

  it("dirty is a dot and a space when there are unsaved changes", () => {
    expect(windowTitle("${dirty}${activeEditorShort}", state({ dirty: true }))).eq("● a.ts");
    expect(windowTitle("${dirty}${activeEditorShort}", state({ dirty: false }))).eq("a.ts");
  });

  it("repository name and branch", () => {
    const title = windowTitle(
      "${activeRepositoryName} (${activeRepositoryBranchName})",
      state({ repository: { name: "app", branch: "main" } }),
    );
    expect(title).eq("app (main)");
  });

  it("keeps plain text around the variables", () => {
    expect(windowTitle("[${activeEditorShort}]", state())).eq("[a.ts]");
  });

  it("leaves out unknown variables", () => {
    expect(windowTitle("${nope}${activeEditorShort}", state())).eq("a.ts");
  });
});

describe("the separator", () => {
  it("goes between two parts", () => {
    expect(windowTitle("${activeEditorShort}${separator}${appName}", state())).eq("a.ts - Editor");
  });

  it("is dropped when the part before it is empty", () => {
    const title = windowTitle("${activeEditorShort}${separator}${appName}", state({ activeFile: undefined }));
    expect(title).eq("Editor");
  });

  it("is dropped when the part after it is empty", () => {
    expect(windowTitle("${activeEditorShort}${separator}${profileName}", state())).eq("a.ts");
  });

  it("is not doubled when a part in the middle is empty", () => {
    const title = windowTitle(
      "${activeEditorShort}${separator}${profileName}${separator}${appName}",
      state(),
    );
    expect(title).eq("a.ts - Editor");
  });

  it("can be changed", () => {
    expect(windowTitle("${activeEditorShort}${separator}${appName}", state(), " | ")).eq(
      "a.ts | Editor",
    );
  });

  it("counts plain text as a part", () => {
    expect(windowTitle("${profileName}${separator}x", state())).eq("x");
    expect(windowTitle("x${separator}${appName}", state())).eq("x - Editor");
  });
});

describe("the default title", () => {
  it("is file, folder and app", () => {
    expect(windowTitle(DEFAULT_TITLE, state())).eq("a.ts - app - Editor");
  });

  it("starts with the dot when modified", () => {
    expect(windowTitle(DEFAULT_TITLE, state({ dirty: true }))).eq("● a.ts - app - Editor");
  });

  it("shows a profile other than the default", () => {
    expect(windowTitle(DEFAULT_TITLE, state({ profileName: "Work" }))).eq("a.ts - app - Work - Editor");
  });

  it("with nothing open is the folder and app", () => {
    expect(windowTitle(DEFAULT_TITLE, state({ activeFile: undefined }))).eq("app - Editor");
  });

  it("with no folder is the file and app", () => {
    expect(windowTitle(DEFAULT_TITLE, state({ folders: [] }))).eq("a.ts - Editor");
  });
});

describe("edge cases", () => {
  it("an untitled editor uses its name for every editor variable", () => {
    const s = state({ activeFile: undefined, untitledName: "Untitled-1" });

    expect(windowTitle("${activeEditorShort}|${activeEditorMedium}|${activeEditorLong}", s)).eq(
      "Untitled-1|Untitled-1|Untitled-1",
    );
    expect(windowTitle("${activeFolderShort}${folderName}", s)).eq("");
  });

  it("a file outside the workspace has its full path as the medium form", () => {
    const s = state({ activeFile: "/tmp/notes.txt" });

    expect(windowTitle("${activeEditorMedium}", s)).eq("/tmp/notes.txt");
    expect(windowTitle("${folderName}", s)).eq("");
  });

  it("a file at the root of the folder has an empty medium folder", () => {
    const s = state({ activeFile: "/work/app/README.md" });

    expect(windowTitle("${activeEditorMedium}", s)).eq("README.md");
    expect(windowTitle("${activeFolderShort}", s)).eq("app");
    expect(windowTitle("${activeFolderMedium}", s)).eq("");
  });

  it("a multi-root workspace: rootName is the workspace, folderName the file's folder", () => {
    const s = state({
      activeFile: "/work/api/src/server.ts",
      folders: [folder, { name: "api", path: "/work/api" }],
      workspaceName: "Everything (Workspace)",
    });

    expect(windowTitle("${rootName}", s)).eq("Everything (Workspace)");
    expect(windowTitle("${folderName}", s)).eq("api");
    expect(windowTitle("${activeEditorMedium}", s)).eq("src/server.ts");
  });

  it("picks the closest folder when folders are nested", () => {
    const s = state({
      activeFile: "/work/app/packages/ui/a.ts",
      folders: [folder, { name: "ui", path: "/work/app/packages/ui" }],
    });

    expect(windowTitle("${folderName}|${activeEditorMedium}", s)).eq("ui|a.ts");
  });

  it("shows Windows paths with forward slashes", () => {
    const s = state({
      activeFile: "C:\\work\\app\\src\\a.ts",
      folders: [{ name: "app", path: "C:\\work\\app" }],
    });

    expect(windowTitle("${activeEditorMedium}", s)).eq("src/a.ts");
  });
});
