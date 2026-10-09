import { describe, expect, it } from "vitest";
import { resolveVariables } from "../../../src/Workspace/variables.js";

// Variable substitution in launch.json, tasks.json and some settings
// (VS Code's Variables Reference). Proposed src/Workspace/variables.ts:
//   resolveVariables(value, context) -> Promise of value with every string
//     inside it resolved (objects and arrays are walked, keys are not)
//   context: { platform, workspaceFolder, workspaceFolders: { name: path },
//     file?, lineNumber?, columnNumber?, selectedText?, userHome, execPath,
//     cwd, pathSeparator?, env, config(key), commands: { id: () => value },
//     inputs: [{ id, type, ... }], ui: { prompt(input), pick(input) },
//     defaultBuildTask? }
// Rules from the docs:
//   every variable is evaluated once, then substituted (an input used twice
//   asks once); variables can't depend on each other; undefined
//   ${env:X} is ""; an unknown ${...} is left as it is; ${config:x} for a
//   missing setting and ${file} with no editor are errors.

const base = {
  platform: "linux",
  workspaceFolder: "/home/your-username/your-project",
  workspaceFolders: { "your-project": "/home/your-username/your-project", Client: "/home/your-username/client" },
  file: "/home/your-username/your-project/folder/file.ext",
  lineNumber: 7,
  columnNumber: 3,
  selectedText: "picked",
  userHome: "/home/your-username",
  execPath: "/usr/share/code/code",
  cwd: "/home/your-username/your-project",
  env: { USERNAME: "me" },
  config: (key: string) => ({ "editor.fontSize": 14 } as Record<string, unknown>)[key],
  commands: { "extension.pickPid": () => "4242" },
  inputs: [],
  ui: { prompt: async () => "typed", pick: async () => "chosen" },
  defaultBuildTask: "npm: build",
};

const resolve = (value: unknown, extra = {}) => resolveVariables(value, { ...base, ...extra });

describe("predefined variables (the docs' example)", () => {
  it.each([
    ["${userHome}", "/home/your-username"],
    ["${workspaceFolder}", "/home/your-username/your-project"],
    ["${workspaceFolderBasename}", "your-project"],
    ["${file}", "/home/your-username/your-project/folder/file.ext"],
    ["${fileWorkspaceFolder}", "/home/your-username/your-project"],
    ["${relativeFile}", "folder/file.ext"],
    ["${relativeFileDirname}", "folder"],
    ["${fileBasename}", "file.ext"],
    ["${fileBasenameNoExtension}", "file"],
    ["${fileExtname}", ".ext"],
    ["${fileDirname}", "/home/your-username/your-project/folder"],
    ["${fileDirnameBasename}", "folder"],
    ["${lineNumber}", "7"],
    ["${columnNumber}", "3"],
    ["${selectedText}", "picked"],
    ["${execPath}", "/usr/share/code/code"],
    ["${defaultBuildTask}", "npm: build"],
    ["${pathSeparator}", "/"],
    ["${/}", "/"],
    ["${cwd}", "/home/your-username/your-project"],
  ])("%s", async (variable, expected) => {
    await expect(resolve(variable)).resolves.eq(expected);
  });
});

describe("other kinds", () => {
  it("${env:NAME}", async () => {
    await expect(resolve("hi ${env:USERNAME}")).resolves.eq("hi me");
  });

  it("an unset environment variable is empty", async () => {
    await expect(resolve("[${env:NOPE}]")).resolves.eq("[]");
  });

  it("${config:setting}", async () => {
    await expect(resolve("${config:editor.fontSize}")).resolves.eq("14");
  });

  it("${config:missing} is an error", async () => {
    await expect(resolve("${config:no.such.setting}")).rejects.toThrow();
  });

  it("${command:id} uses what the command returns", async () => {
    await expect(resolve("pid ${command:extension.pickPid}")).resolves.eq("pid 4242");
  });

  it("${workspaceFolder:Name} picks a folder of a multi-root workspace", async () => {
    await expect(resolve("${workspaceFolder:Client}/src")).resolves.eq("/home/your-username/client/src");
  });

  it("an unknown variable is left alone", async () => {
    await expect(resolve("${notAVariable}")).resolves.eq("${notAVariable}");
  });

  it("${file} with no editor open is an error", async () => {
    await expect(resolve("${file}", { file: undefined })).rejects.toThrow();
  });
});

describe("inputs", () => {
  it("promptString asks for text", async () => {
    const inputs = [{ id: "name", type: "promptString", description: "Name?" }];

    await expect(resolve("hello ${input:name}", { inputs })).resolves.eq("hello typed");
  });

  it("pickString picks from options", async () => {
    const inputs = [{ id: "env", type: "pickString", options: ["dev", "prod"] }];

    await expect(resolve("${input:env}", { inputs })).resolves.eq("chosen");
  });

  it("command runs a command", async () => {
    const inputs = [{ id: "pid", type: "command", command: "extension.pickPid" }];

    await expect(resolve("${input:pid}", { inputs })).resolves.eq("4242");
  });

  it("an input used twice is asked only once", async () => {
    let asked = 0;
    const inputs = [{ id: "name", type: "promptString" }];
    const ui = { prompt: async () => `answer ${++asked}`, pick: async () => "" };

    await expect(resolve("${input:name} ${input:name}", { inputs, ui })).resolves.eq("answer 1 answer 1");
    expect(asked).eq(1);
  });
});

describe("structures and platforms", () => {
  it("resolves strings inside objects and arrays, not the keys", async () => {
    await expect(
      resolve({ "${file}": "${fileBasename}", args: ["${lineNumber}", 5, true] }),
    ).resolves.toEqual({ "${file}": "file.ext", args: ["7", 5, true] });
  });

  it("uses backslashes on Windows", async () => {
    const windows = {
      platform: "win32",
      workspaceFolder: "C:\\proj",
      file: "C:\\proj\\folder\\file.ext",
    };

    await expect(resolve("${relativeFile} ${/}", windows)).resolves.eq("folder\\file.ext \\");
  });
});
