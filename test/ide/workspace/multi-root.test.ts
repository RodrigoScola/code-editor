import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RecentlyOpened,
  folderFor,
  labelFor,
  parseWorkspaceFile,
  scopeInclude,
} from "../../../src/Workspace/workspace.js";

// Multi-root workspaces. Proposed src/Workspace/workspace.ts:
//   parseWorkspaceFile(path, jsonc) -> { folders: [{ name, path }],
//     settings, launch, tasks }; relative folder paths resolve against the
//     .code-workspace file's folder; name defaults to the folder's name
//   folderFor(folders, file) -> the folder containing it (the deepest)
//   labelFor(folders, file) -> how the file is shown: "Name/relative/path"
//     when there are several folders, just the relative path with one
//   scopeInclude(folders, include) -> { folder, pattern } for a search
//     include starting with ./Name/ (limits the search to that folder)
//   new RecentlyOpened({ max }) add({ kind: "file" | "folder" | "workspace",
//     path }), list() newest first without repeats, remove(path),
//     prune(exists) drops entries that are gone

const ws = `{
  // comments are fine
  "folders": [
    { "path": "server" },
    { "path": "../client", "name": "Client" }
  ],
  "settings": { "editor.tabSize": 2 }
}`;

describe("parseWorkspaceFile", () => {
  const parsed = parseWorkspaceFile(join("/home", "me", "proj", "app.code-workspace"), ws);

  it("resolves folder paths against the workspace file", () => {
    expect(parsed.folders).toEqual([
      { name: "server", path: join("/home", "me", "proj", "server") },
      { name: "Client", path: join("/home", "me", "client") },
    ]);
  });

  it("keeps the workspace settings", () => {
    expect(parsed.settings).toEqual({ "editor.tabSize": 2 });
  });
});

const folders = [
  { name: "server", path: "/p/server" },
  { name: "Client", path: "/p/client" },
  { name: "lib", path: "/p/client/lib" },
];

describe("folders and labels", () => {
  it("folderFor picks the deepest folder", () => {
    expect(folderFor(folders, "/p/client/src/a.ts")?.name).eq("Client");
    expect(folderFor(folders, "/p/client/lib/b.ts")?.name).eq("lib");
    expect(folderFor(folders, "/elsewhere/c.ts")).toBeUndefined();
  });

  it("labels include the folder name when there are several folders", () => {
    expect(labelFor(folders, "/p/server/src/a.ts")).eq("server/src/a.ts");
  });

  it("labels are just the relative path with one folder", () => {
    expect(labelFor([folders[0]], "/p/server/src/a.ts")).eq("src/a.ts");
  });

  it("scopeInclude limits a search to one folder", () => {
    expect(scopeInclude(folders, "./Client/**/*.ts")).toEqual({ folder: "/p/client", pattern: "**/*.ts" });
    expect(scopeInclude(folders, "**/*.ts")).toEqual({ folder: undefined, pattern: "**/*.ts" });
  });
});

describe("RecentlyOpened", () => {
  it("lists newest first without repeats", () => {
    const recent = new RecentlyOpened({ max: 10 });
    recent.add({ kind: "file", path: "/a" });
    recent.add({ kind: "folder", path: "/b" });
    recent.add({ kind: "file", path: "/a" });

    expect(recent.list().map((e: { path: string }) => e.path)).toEqual(["/a", "/b"]);
  });

  it("keeps at most max entries", () => {
    const recent = new RecentlyOpened({ max: 2 });
    for (const path of ["/a", "/b", "/c"]) recent.add({ kind: "file", path });

    expect(recent.list().map((e: { path: string }) => e.path)).toEqual(["/c", "/b"]);
  });

  it("prune drops entries that are gone", () => {
    const recent = new RecentlyOpened({ max: 10 });
    recent.add({ kind: "file", path: "/gone" });
    recent.add({ kind: "file", path: "/here" });

    recent.prune((path: string) => path === "/here");

    expect(recent.list().map((e: { path: string }) => e.path)).toEqual(["/here"]);
  });
});
