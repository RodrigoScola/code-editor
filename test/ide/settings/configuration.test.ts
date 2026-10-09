import { describe, expect, it } from "vitest";
import { Configuration } from "../../../src/Settings/configuration.js";

// Settings with VS Code's scopes. Proposed src/Settings/configuration.ts:
//   new Configuration({ defaults, schema? })
//   config.setLayer("user" | "workspace" | "policy", values)
//   config.setFolderLayer(folder, values)
//   config.get(key, { language?, folder? })
//   config.inspect(key) -> { defaultValue, userValue, workspaceValue, ... }
//   config.update(key, value, target = "user")
//   config.onDidChange(listener) with event.affects(sectionOrKey)
// Rules (VS Code docs, "Settings precedence"):
//   default < user < workspace < folder < language-specific (same order)
//   < policy; objects are merged across scopes, arrays and primitives
//   replaced; a language-specific value beats a non-language one even from
//   a narrower scope; "[javascript][typescript]" applies to both, but a
//   single-language block beats it; some settings (git.path) can't be set
//   in a workspace; a folder can only set "resource" scoped settings;
//   "editor.tabSize" and { "editor": { "tabSize" } } mean the same.

const defaults = {
  "editor.tabSize": 4,
  "editor.rulers": [],
  "workbench.colorCustomizations": {},
  "git.path": null,
  "window.zoomLevel": 0,
};
const schema = {
  "git.path": { restricted: true },
  "window.zoomLevel": { scope: "window" },
  "editor.tabSize": { scope: "language-overridable" },
};

const fresh = () => new Configuration({ defaults, schema });

describe("scopes", () => {
  it("defaults", () => {
    expect(fresh().get("editor.tabSize")).eq(4);
  });

  it("user over default, workspace over user, folder over workspace", () => {
    const config = fresh();
    config.setLayer("user", { "editor.tabSize": 2 });
    expect(config.get("editor.tabSize")).eq(2);

    config.setLayer("workspace", { "editor.tabSize": 3 });
    expect(config.get("editor.tabSize")).eq(3);

    config.setFolderLayer("/p/app", { "editor.tabSize": 8 });
    expect(config.get("editor.tabSize", { folder: "/p/app" })).eq(8);
    expect(config.get("editor.tabSize")).eq(3);
  });

  it("policy wins over everything", () => {
    const config = fresh();
    config.setLayer("workspace", { "editor.tabSize": 3 });
    config.setLayer("policy", { "editor.tabSize": 6 });

    expect(config.get("editor.tabSize")).eq(6);
  });

  it("merges objects and replaces arrays", () => {
    const config = fresh();
    config.setLayer("user", { "workbench.colorCustomizations": { a: 1, b: 1 }, "editor.rulers": [80] });
    config.setLayer("workspace", { "workbench.colorCustomizations": { b: 2 }, "editor.rulers": [100] });

    expect(config.get("workbench.colorCustomizations")).toEqual({ a: 1, b: 2 });
    expect(config.get("editor.rulers")).toEqual([100]);
  });

  it("nested objects mean the same as dotted keys", () => {
    const config = fresh();
    config.setLayer("user", { editor: { tabSize: 2 } });

    expect(config.get("editor.tabSize")).eq(2);
  });
});

describe("language-specific settings", () => {
  it("apply only to that language", () => {
    const config = fresh();
    config.setLayer("user", { "[typescript]": { "editor.tabSize": 2 } });

    expect(config.get("editor.tabSize", { language: "typescript" })).eq(2);
    expect(config.get("editor.tabSize", { language: "python" })).eq(4);
  });

  it("a user language value beats a workspace value without a language", () => {
    const config = fresh();
    config.setLayer("user", { "[typescript]": { "editor.tabSize": 2 } });
    config.setLayer("workspace", { "editor.tabSize": 8 });

    expect(config.get("editor.tabSize", { language: "typescript" })).eq(2);
  });

  it("a multi-language block applies to each language", () => {
    const config = fresh();
    config.setLayer("user", { "[javascript][typescript]": { "editor.tabSize": 2 } });

    expect(config.get("editor.tabSize", { language: "javascript" })).eq(2);
    expect(config.get("editor.tabSize", { language: "typescript" })).eq(2);
  });

  it("a single-language block beats a multi-language one", () => {
    const config = fresh();
    config.setLayer("user", { "[typescript]": { "editor.tabSize": 3 } });
    config.setLayer("workspace", { "[javascript][typescript]": { "editor.tabSize": 2 } });

    expect(config.get("editor.tabSize", { language: "typescript" })).eq(3);
  });
});

describe("restricted and folder-limited settings", () => {
  it("ignores restricted settings from the workspace", () => {
    const config = fresh();
    config.setLayer("user", { "git.path": "/usr/bin/git" });
    config.setLayer("workspace", { "git.path": "/evil/git" });

    expect(config.get("git.path")).eq("/usr/bin/git");
  });

  it("ignores window settings in a folder", () => {
    const config = fresh();
    config.setFolderLayer("/p/app", { "window.zoomLevel": 3 });

    expect(config.get("window.zoomLevel", { folder: "/p/app" })).eq(0);
  });
});

describe("inspect, update and change events", () => {
  it("inspect shows each layer's value", () => {
    const config = fresh();
    config.setLayer("user", { "editor.tabSize": 2 });

    expect(config.inspect("editor.tabSize")).toMatchObject({ defaultValue: 4, userValue: 2, workspaceValue: undefined });
  });

  it("update writes to the target layer", () => {
    const config = fresh();
    config.update("editor.tabSize", 6, "workspace");

    expect(config.inspect("editor.tabSize").workspaceValue).eq(6);
  });

  it("change events say which sections changed", () => {
    const config = fresh();
    const events: { affects(key: string): boolean }[] = [];
    config.onDidChange((e: { affects(key: string): boolean }) => events.push(e));

    config.update("editor.tabSize", 6);

    expect(events[0].affects("editor")).eq(true);
    expect(events[0].affects("editor.tabSize")).eq(true);
    expect(events[0].affects("git")).eq(false);
  });
});
