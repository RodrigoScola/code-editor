import { describe, expect, it } from "vitest";
import { WorkspaceTrust } from "../../../src/Workspace/trust.js";

// Workspace Trust (restricted mode), all local. Proposed
// src/Workspace/trust.ts:
//   new WorkspaceTrust({ enabled = true, trustedFolders = [],
//     emptyWindowTrusted = true })
//   trust.isTrusted(folder) -> true if the folder or a folder above it is
//     trusted, or trust is disabled
//   trust.trust(folder) / trust.untrust(folder)
//   trust.can(feature, folder) -> false for "tasks", "debug", "terminal"
//     and "workspaceSettings.restricted" in an untrusted folder
//   trust.filterSettings(settings, folder, restrictedKeys) -> workspace
//     settings with restricted keys removed when untrusted

describe("WorkspaceTrust", () => {
  it("an unknown folder is not trusted", () => {
    expect(new WorkspaceTrust({}).isTrusted("/p")).eq(false);
  });

  it("trusting a folder trusts everything under it", () => {
    const trust = new WorkspaceTrust({ trustedFolders: ["/home/me/work"] });

    expect(trust.isTrusted("/home/me/work/app")).eq(true);
    expect(trust.isTrusted("/home/me/other")).eq(false);
  });

  it("a folder named like a trusted one is not inside it", () => {
    const trust = new WorkspaceTrust({ trustedFolders: ["/home/me/work"] });

    expect(trust.isTrusted("/home/me/workshop")).eq(false);
  });

  it("trust and untrust", () => {
    const trust = new WorkspaceTrust({});
    trust.trust("/p");
    expect(trust.isTrusted("/p")).eq(true);

    trust.untrust("/p");
    expect(trust.isTrusted("/p")).eq(false);
  });

  it("restricted mode blocks tasks, debugging and terminals", () => {
    const trust = new WorkspaceTrust({});

    expect(["tasks", "debug", "terminal"].map((f) => trust.can(f, "/p"))).toEqual([false, false, false]);
  });

  it("a trusted folder allows them", () => {
    const trust = new WorkspaceTrust({ trustedFolders: ["/p"] });

    expect(["tasks", "debug", "terminal"].map((f) => trust.can(f, "/p"))).toEqual([true, true, true]);
  });

  it("disabling trust trusts everything", () => {
    expect(new WorkspaceTrust({ enabled: false }).isTrusted("/anything")).eq(true);
  });

  it("an empty window follows emptyWindowTrusted", () => {
    expect(new WorkspaceTrust({}).isTrusted(undefined)).eq(true);
    expect(new WorkspaceTrust({ emptyWindowTrusted: false }).isTrusted(undefined)).eq(false);
  });

  it("drops restricted settings from an untrusted workspace", () => {
    const trust = new WorkspaceTrust({});

    expect(trust.filterSettings({ "git.path": "/evil", "editor.tabSize": 2 }, "/p", ["git.path"])).toEqual({
      "editor.tabSize": 2,
    });
  });
});
