import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { folderFor, parseWorkspaceFile } from "../../../src/Workspace/workspace.js";
import { WorkspaceTrust } from "../../../src/Workspace/trust.js";
import { parseArgs, parseVscodeUrl } from "../../../src/Cli/args.js";

// Edge cases for workspaces, trust and the command line (base specs:
// multi-root, trust, args).

describe("workspace files", () => {
  it("an absolute folder path is kept", () => {
    const parsed = parseWorkspaceFile(join("/w", "a.code-workspace"), '{ "folders": [{ "path": "/abs/folder" }] }');

    expect(parsed.folders[0].path).eq("/abs/folder");
  });

  it("the same folder listed twice appears once", () => {
    const parsed = parseWorkspaceFile(join("/w", "a.code-workspace"), '{ "folders": [{ "path": "x" }, { "path": "./x" }] }');

    expect(parsed.folders).toHaveLength(1);
  });

  it("a folder named like another's prefix is not inside it", () => {
    const folders = [
      { name: "app", path: "/p/app" },
      { name: "app2", path: "/p/app2" },
    ];

    expect(folderFor(folders, "/p/app2/x.ts")?.name).eq("app2");
  });
});

describe("trust", () => {
  it("trusting a file's folder trusts files in it", () => {
    const trust = new WorkspaceTrust({ trustedFolders: ["/p"] });

    expect(trust.isTrusted("/p/sub/file.ts")).eq(true);
  });

  it("trusted folder paths are compared without a trailing slash", () => {
    const trust = new WorkspaceTrust({ trustedFolders: ["/p/"] });

    expect(trust.isTrusted("/p")).eq(true);
  });
});

describe("command line", () => {
  const options = { cwd: "/p", platform: "linux", kindOf: () => undefined };

  it("-g without a line opens the file normally", () => {
    expect(parseArgs(["-g", "a.ts"], options).files).toEqual([{ path: "/p/a.ts", create: true }]);
  });

  it("-g with a non-number after the colon keeps it in the name", () => {
    expect(parseArgs(["-g", "a.ts:x"], options).files[0].path).eq("/p/a.ts:x");
  });

  it("options can come after files", () => {
    expect(parseArgs(["a.ts", "-n"], options)).toMatchObject({ newWindow: true });
  });

  it("a URL with a Windows path", () => {
    expect(parseVscodeUrl("vscode://file/c:/p/a.ts:3")).toEqual({ kind: "file", path: "c:/p/a.ts", line: 3 });
  });

  it("an unknown kind of URL is undefined", () => {
    expect(parseVscodeUrl("vscode://somewhere/else")).toBeUndefined();
  });
});
