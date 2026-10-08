import { describe, expect, it } from "vitest";
import { buildCommandLine, shellKind } from "../../../src/Tasks/shellQuoting.js";

// Building a shell task's command line (tasks docs: "Command and arguments
// quoting"). Proposed src/Tasks/shellQuoting.ts:
//   shellKind(executable) -> "bash" (also sh, zsh, fish, git bash) |
//     "pwsh" (powershell too) | "cmd"
//   buildCommandLine(command, args, shell) -> string
//     command and each arg is a string or { value, quoting }
//     quoting: "escape"  escape special characters (bash \, pwsh `, cmd ^)
//              "strong"  bash/pwsh '...', cmd "..."
//              "weak"    "..." everywhere
//     plain strings without spaces or special characters are left alone

const arg = (value: string, quoting: string) => ({ value, quoting });

describe("shellKind", () => {
  it.each([
    ["/bin/bash", "bash"],
    ["/usr/bin/zsh", "bash"],
    ["C:\\Program Files\\Git\\bin\\bash.exe", "bash"],
    ["pwsh", "pwsh"],
    ["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "pwsh"],
    ["C:\\Windows\\System32\\cmd.exe", "cmd"],
  ])("%s is %s", (executable, kind) => {
    expect(shellKind(executable)).eq(kind);
  });
});

describe("bash", () => {
  it("leaves plain words alone", () => {
    expect(buildCommandLine("echo", ["hello"], "bash")).eq("echo hello");
  });

  it("escape puts a backslash before spaces", () => {
    expect(buildCommandLine("echo", [arg("a b", "escape")], "bash")).eq("echo a\\ b");
  });

  it("strong uses single quotes", () => {
    expect(buildCommandLine("echo", [arg("a b", "strong")], "bash")).eq("echo 'a b'");
  });

  it("weak uses double quotes", () => {
    expect(buildCommandLine("echo", [arg("$HOME b", "weak")], "bash")).eq('echo "$HOME b"');
  });

  it("quotes a command with spaces too", () => {
    expect(buildCommandLine(arg("/my tools/run", "strong"), [], "bash")).eq("'/my tools/run'");
  });
});

describe("PowerShell", () => {
  it("escape uses a backtick", () => {
    expect(buildCommandLine("echo", [arg("a b", "escape")], "pwsh")).eq("echo a` b");
  });

  it("strong uses single quotes", () => {
    expect(buildCommandLine("echo", [arg("a b", "strong")], "pwsh")).eq("echo 'a b'");
  });

  it("weak uses double quotes", () => {
    expect(buildCommandLine("echo", [arg("a b", "weak")], "pwsh")).eq('echo "a b"');
  });
});

describe("cmd", () => {
  it("escape uses a caret", () => {
    expect(buildCommandLine("echo", [arg("a b", "escape")], "cmd")).eq("echo a^ b");
  });

  it("strong and weak both use double quotes", () => {
    expect(buildCommandLine("echo", [arg("a b", "strong")], "cmd")).eq('echo "a b"');
    expect(buildCommandLine("echo", [arg("a b", "weak")], "cmd")).eq('echo "a b"');
  });
});

describe("several arguments", () => {
  it("joins them with spaces, quoting each its own way", () => {
    expect(buildCommandLine("git", ["commit", "-m", arg("a message", "strong")], "bash")).eq(
      "git commit -m 'a message'",
    );
  });
});
