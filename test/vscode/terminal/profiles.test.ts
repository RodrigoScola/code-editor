import { describe, expect, it } from "vitest";
import {
  defaultProfile,
  escapePathForShell,
  resolveLaunchConfig,
  resolveProfiles,
} from "../../../src/Terminal/profiles.js";

// Terminal profiles (terminal.integrated.profiles.<platform>). Proposed
// src/Terminal/profiles.ts:
//   resolveProfiles({ platform, settings, detected }) -> [{ name, path,
//     args, env?, icon?, overrideName? }]: detected shells plus configured
//     ones; a configured profile set to null hides a detected one
//   defaultProfile({ platform, settings, profiles, env }) -> the profile in
//     terminal.integrated.defaultProfile.<platform>, else $SHELL on
//     linux/osx, else PowerShell on Windows
//   resolveLaunchConfig(profile, { platform, settings, env, variables })
//     -> { path, args, env, name } with ${env:X} and other variables
//     resolved, env = process env + terminal.integrated.env.<platform> +
//     profile env, where null removes a variable
//   escapePathForShell(path, shell) for dropping a file into the terminal:
//     bash/zsh/fish wrap in single quotes when needed ('it'\''s'),
//     pwsh wraps in single quotes doubling ' inside, cmd wraps in double quotes

const detected = [
  { name: "bash", path: "/bin/bash", args: [] },
  { name: "zsh", path: "/bin/zsh", args: [] },
];

describe("resolveProfiles", () => {
  it("adds configured profiles to the detected ones", () => {
    const profiles = resolveProfiles({
      platform: "linux",
      detected,
      settings: { "terminal.integrated.profiles.linux": { "zsh login": { path: "/bin/zsh", args: ["-l"] } } },
    });

    expect(profiles.map((p: { name: string }) => p.name)).toEqual(["bash", "zsh", "zsh login"]);
  });

  it("null hides a detected profile", () => {
    const profiles = resolveProfiles({
      platform: "linux",
      detected,
      settings: { "terminal.integrated.profiles.linux": { zsh: null } },
    });

    expect(profiles.map((p: { name: string }) => p.name)).toEqual(["bash"]);
  });

  it("only reads the settings for the current platform", () => {
    const profiles = resolveProfiles({
      platform: "linux",
      detected,
      settings: { "terminal.integrated.profiles.windows": { cmd: { path: "cmd.exe" } } },
    });

    expect(profiles.map((p: { name: string }) => p.name)).toEqual(["bash", "zsh"]);
  });
});

describe("defaultProfile", () => {
  it("uses the configured default", () => {
    const profile = defaultProfile({
      platform: "linux",
      profiles: detected,
      settings: { "terminal.integrated.defaultProfile.linux": "zsh" },
      env: { SHELL: "/bin/bash" },
    });

    expect(profile.name).eq("zsh");
  });

  it("falls back to $SHELL on Linux and macOS", () => {
    expect(defaultProfile({ platform: "linux", profiles: detected, settings: {}, env: { SHELL: "/bin/zsh" } }).path).eq(
      "/bin/zsh",
    );
  });

  it("falls back to PowerShell on Windows", () => {
    const profiles = [
      { name: "Command Prompt", path: "C:\\Windows\\System32\\cmd.exe", args: [] },
      { name: "PowerShell", path: "C:\\Program Files\\PowerShell\\7\\pwsh.exe", args: [] },
    ];

    expect(defaultProfile({ platform: "win32", profiles, settings: {}, env: {} }).name).eq("PowerShell");
  });
});

describe("resolveLaunchConfig", () => {
  it("merges the environment, with null removing a variable", () => {
    const config = resolveLaunchConfig(
      { name: "bash", path: "/bin/bash", args: [], env: { PROFILE_VAR: "p", REMOVE_ME: null } },
      {
        platform: "linux",
        env: { PATH: "/usr/bin", REMOVE_ME: "x", SHARED: "process" },
        settings: { "terminal.integrated.env.linux": { SHARED: "setting" } },
      },
    );

    expect(config.env).toEqual({ PATH: "/usr/bin", SHARED: "setting", PROFILE_VAR: "p" });
  });

  it("resolves variables in the path, args and env", () => {
    const config = resolveLaunchConfig(
      { name: "custom", path: "${env:HOME}/bin/sh", args: ["--rc", "${workspaceFolder}/.rc"], env: { DIR: "${workspaceFolder}" } },
      { platform: "linux", env: { HOME: "/home/me" }, settings: {}, variables: { workspaceFolder: "/p" } },
    );

    expect(config.path).eq("/home/me/bin/sh");
    expect(config.args).toEqual(["--rc", "/p/.rc"]);
    expect(config.env.DIR).eq("/p");
  });

  it("overrideName keeps the profile name as the title", () => {
    const config = resolveLaunchConfig(
      { name: "My Shell", path: "/bin/bash", args: [], overrideName: true },
      { platform: "linux", env: {}, settings: {} },
    );

    expect(config.name).eq("My Shell");
  });
});

describe("escapePathForShell", () => {
  it("leaves simple paths alone", () => {
    expect(escapePathForShell("/p/a.txt", "bash")).eq("/p/a.txt");
  });

  it("bash quotes paths with spaces and escapes quotes", () => {
    expect(escapePathForShell("/p/my file.txt", "bash")).eq("'/p/my file.txt'");
    expect(escapePathForShell("/p/it's.txt", "bash")).eq("'/p/it'\\''s.txt'");
  });

  it("PowerShell doubles single quotes", () => {
    expect(escapePathForShell("C:\\my dir\\it's.txt", "pwsh")).eq("'C:\\my dir\\it''s.txt'");
  });

  it("cmd uses double quotes", () => {
    expect(escapePathForShell("C:\\my dir\\a.txt", "cmd")).eq('"C:\\my dir\\a.txt"');
  });
});
