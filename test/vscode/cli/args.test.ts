import { describe, expect, it } from "vitest";
import { parseArgs, parseVscodeUrl } from "../../../src/Cli/args.js";

// The `code` command line (VS Code docs, "Command Line Interface"), local
// options only. Proposed src/Cli/args.ts:
//   parseArgs(argv, { cwd, platform, kindOf(path) -> "file" | "folder" |
//     undefined }) -> {
//       files: [{ path, line?, column?, create? }], folders: [path],
//       diff?: [a, b], merge?: { input1, input2, base, result },
//       newWindow, reuseWindow, wait, add: [path], remove: [path],
//       stdin, locale?, profile?, warnings: [string] }
//   paths are made absolute against cwd; a file that doesn't exist is
//   opened with create: true; -g/--goto reads file:line[:column] (not
//   splitting a Windows drive letter); "--" ends the options; unknown
//   options become warnings
//   parseVscodeUrl(url) -> { kind: "file", path, line?, column? } |
//     { kind: "settings", id }

const kinds: Record<string, "file" | "folder"> = {
  "/p/a.ts": "file",
  "/p/b.ts": "file",
  "/p/src": "folder",
  "/p/lib": "folder",
  "C:\\p\\a.ts": "file",
};
const options = { cwd: "/p", platform: "linux", kindOf: (path: string) => kinds[path] };
const parse = (...argv: string[]) => parseArgs(argv, options);

describe("files and folders", () => {
  it("separates files and folders and makes paths absolute", () => {
    expect(parse("a.ts", "src")).toMatchObject({
      files: [{ path: "/p/a.ts" }],
      folders: ["/p/src"],
    });
  });

  it("a file that doesn't exist is created", () => {
    expect(parse("new.ts").files).toEqual([{ path: "/p/new.ts", create: true }]);
  });

  it("several folders", () => {
    expect(parse("src", "lib").folders).toEqual(["/p/src", "/p/lib"]);
  });

  it("- reads from stdin", () => {
    expect(parse("-").stdin).eq(true);
  });

  it("-- ends the options", () => {
    expect(parse("--", "-n").files).toEqual([{ path: "/p/-n", create: true }]);
  });
});

describe("--goto", () => {
  it("file:line:column", () => {
    expect(parse("-g", "a.ts:10:5").files).toEqual([{ path: "/p/a.ts", line: 10, column: 5 }]);
  });

  it("file:line", () => {
    expect(parse("--goto", "a.ts:10").files).toEqual([{ path: "/p/a.ts", line: 10 }]);
  });

  it("keeps a Windows drive letter", () => {
    const result = parseArgs(["-g", "C:\\p\\a.ts:3:2"], { ...options, platform: "win32" });

    expect(result.files).toEqual([{ path: "C:\\p\\a.ts", line: 3, column: 2 }]);
  });

  it("without -g a colon is part of the file name", () => {
    expect(parse("a.ts:10").files[0].path).eq("/p/a.ts:10");
  });
});

describe("diff and merge", () => {
  it("-d takes two files", () => {
    expect(parse("-d", "a.ts", "b.ts").diff).toEqual(["/p/a.ts", "/p/b.ts"]);
  });

  it("-d with one file is a warning", () => {
    expect(parse("-d", "a.ts").warnings.length).toBeGreaterThan(0);
  });

  it("-m takes two inputs, a base and a result", () => {
    expect(parse("-m", "a.ts", "b.ts", "base.ts", "out.ts").merge).toEqual({
      input1: "/p/a.ts",
      input2: "/p/b.ts",
      base: "/p/base.ts",
      result: "/p/out.ts",
    });
  });
});

describe("window options", () => {
  it("-n, -r and -w", () => {
    expect(parse("-n", "-w")).toMatchObject({ newWindow: true, wait: true, reuseWindow: false });
    expect(parse("-r").reuseWindow).eq(true);
  });

  it("-a and --remove change the workspace's folders", () => {
    expect(parse("-a", "src", "--remove", "lib")).toMatchObject({ add: ["/p/src"], remove: ["/p/lib"] });
  });

  it("--locale and --profile take a value", () => {
    expect(parse("--locale", "pt-br", "--profile", "Work")).toMatchObject({ locale: "pt-br", profile: "Work" });
    expect(parse("--locale=es").locale).eq("es");
  });

  it("unknown options are warnings, not errors", () => {
    expect(parse("--frobnicate", "a.ts").warnings.join("\n")).toContain("frobnicate");
  });
});

describe("parseVscodeUrl", () => {
  it("opens a file at a position", () => {
    expect(parseVscodeUrl("vscode://file/home/me/a.ts:10:5")).toEqual({
      kind: "file",
      path: "/home/me/a.ts",
      line: 10,
      column: 5,
    });
  });

  it("opens a file without a position", () => {
    expect(parseVscodeUrl("vscode://file/home/me/a.ts")).toEqual({ kind: "file", path: "/home/me/a.ts" });
  });

  it("opens a setting", () => {
    expect(parseVscodeUrl("vscode://settings/editor.tabSize")).toEqual({ kind: "settings", id: "editor.tabSize" });
  });

  it("decodes escaped characters", () => {
    expect(parseVscodeUrl("vscode://file/home/me/my%20file.ts").path).eq("/home/me/my file.ts");
  });
});
