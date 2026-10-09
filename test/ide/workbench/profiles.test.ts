import { describe, expect, it } from "vitest";
import { Profiles } from "../../../src/Workbench/profiles.js";

// Profiles (VS Code: Profiles editor, --profile on the command line): named
// sets of settings, keybindings, snippets, tasks and UI state, switched as
// a whole. Extensions are left out (no marketplace).
//
// Proposed src/Workbench/profiles.ts:
//   new Profiles()                       starts with "Default"
//   profiles.list() -> names, "Default" first, the rest in creation order
//   profiles.create(name, { from?, useDefault? })
//     from: copy another profile's data (a copy, not a link)
//     useDefault: parts shared with Default instead of the profile's own:
//       ("settings" | "keybindings" | "snippets" | "tasks" | "uiState")[]
//   profiles.rename(name, newName) / profiles.delete(name)
//   profiles.data(name) -> { settings, keybindings, snippets, tasks, uiState }
//     changing a shared part changes Default's
//   profiles.active() / profiles.use(name)
//   profiles.setForWorkspace(folder, name) / profiles.forWorkspace(folder)
//     -> the profile a folder opens with, "Default" when none was set
//   profiles.export(name) -> JSON text; profiles.import(text, name?)
//
// Rules: names are unique ignoring case, not empty; Default can't be
// renamed or deleted; deleting the active profile switches to Default and
// forgets the folders that used it.

describe("creating", () => {
  it("starts with Default, active", () => {
    const profiles = new Profiles();

    expect(profiles.list()).toEqual(["Default"]);
    expect(profiles.active()).eq("Default");
  });

  it("creates an empty profile", () => {
    const profiles = new Profiles();
    profiles.data("Default").settings.tab_width = 2;

    profiles.create("Work");

    expect(profiles.list()).toEqual(["Default", "Work"]);
    expect(profiles.data("Work").settings).toEqual({});
  });

  it("copies another profile", () => {
    const profiles = new Profiles();
    profiles.data("Default").settings.tab_width = 2;

    profiles.create("Copy", { from: "Default" });

    expect(profiles.data("Copy").settings).toEqual({ tab_width: 2 });
  });

  it("a copy is separate from where it came from", () => {
    const profiles = new Profiles();
    profiles.data("Default").settings.tab_width = 2;
    profiles.create("Copy", { from: "Default" });

    profiles.data("Copy").settings.tab_width = 8;

    expect(profiles.data("Default").settings.tab_width).eq(2);
  });

  it("refuses a name that exists, ignoring case", () => {
    const profiles = new Profiles();
    profiles.create("Work");

    expect(() => profiles.create("work")).toThrow();
    expect(() => profiles.create("default")).toThrow();
  });

  it("refuses an empty name", () => {
    expect(() => new Profiles().create("  ")).toThrow();
  });
});

describe("parts shared with Default", () => {
  it("reads Default's settings", () => {
    const profiles = new Profiles();
    profiles.data("Default").settings.tab_width = 2;
    profiles.create("Lite", { useDefault: ["settings"] });

    expect(profiles.data("Lite").settings.tab_width).eq(2);
  });

  it("changing a shared part changes Default", () => {
    const profiles = new Profiles();
    profiles.create("Lite", { useDefault: ["keybindings"] });

    profiles.data("Lite").keybindings.push({ key: "ctrl+s", command: "textEditor.saveFile" });

    expect(profiles.data("Default").keybindings).toEqual([{ key: "ctrl+s", command: "textEditor.saveFile" }]);
  });

  it("parts that aren't shared stay the profile's own", () => {
    const profiles = new Profiles();
    profiles.data("Default").settings.tab_width = 2;
    profiles.create("Lite", { useDefault: ["keybindings"] });

    expect(profiles.data("Lite").settings).toEqual({});
  });
});

describe("switching", () => {
  it("use makes a profile active", () => {
    const profiles = new Profiles();
    profiles.create("Work");

    profiles.use("Work");

    expect(profiles.active()).eq("Work");
  });

  it("use refuses a profile that doesn't exist", () => {
    expect(() => new Profiles().use("Nope")).toThrow();
  });

  it("a folder opens with the profile set for it", () => {
    const profiles = new Profiles();
    profiles.create("Work");

    profiles.setForWorkspace("/work/app", "Work");

    expect(profiles.forWorkspace("/work/app")).eq("Work");
    expect(profiles.forWorkspace("/other")).eq("Default");
  });
});

describe("renaming and deleting", () => {
  it("renames, keeping data and folders", () => {
    const profiles = new Profiles();
    profiles.create("Work");
    profiles.data("Work").settings.tab_width = 3;
    profiles.setForWorkspace("/work/app", "Work");

    profiles.rename("Work", "Job");

    expect(profiles.list()).toEqual(["Default", "Job"]);
    expect(profiles.data("Job").settings.tab_width).eq(3);
    expect(profiles.forWorkspace("/work/app")).eq("Job");
  });

  it("can change only the case of a name", () => {
    const profiles = new Profiles();
    profiles.create("work");

    profiles.rename("work", "Work");

    expect(profiles.list()).toEqual(["Default", "Work"]);
  });

  it("Default can't be renamed or deleted", () => {
    const profiles = new Profiles();

    expect(() => profiles.rename("Default", "Main")).toThrow();
    expect(() => profiles.delete("Default")).toThrow();
  });

  it("deleting the active profile goes back to Default", () => {
    const profiles = new Profiles();
    profiles.create("Work");
    profiles.use("Work");

    profiles.delete("Work");

    expect(profiles.active()).eq("Default");
    expect(profiles.list()).toEqual(["Default"]);
  });

  it("deleting forgets the folders that used it", () => {
    const profiles = new Profiles();
    profiles.create("Work");
    profiles.setForWorkspace("/work/app", "Work");

    profiles.delete("Work");

    expect(profiles.forWorkspace("/work/app")).eq("Default");
  });
});

describe("export and import", () => {
  it("round trips a profile's data", () => {
    const profiles = new Profiles();
    profiles.create("Work");
    profiles.data("Work").settings.tab_width = 3;
    profiles.data("Work").snippets["typescript"] = { log: { prefix: "log", body: "console.log($1)" } };

    const other = new Profiles();
    other.import(profiles.export("Work"));

    expect(other.list()).toEqual(["Default", "Work"]);
    expect(other.data("Work")).toEqual(profiles.data("Work"));
  });

  it("imports under another name", () => {
    const profiles = new Profiles();
    profiles.create("Work");

    profiles.import(profiles.export("Work"), "Work 2");

    expect(profiles.list()).toEqual(["Default", "Work", "Work 2"]);
  });

  it("refuses to import over an existing name", () => {
    const profiles = new Profiles();
    profiles.create("Work");

    expect(() => profiles.import(profiles.export("Work"))).toThrow();
  });

  it("an exported shared part carries Default's data", () => {
    const profiles = new Profiles();
    profiles.data("Default").settings.tab_width = 2;
    profiles.create("Lite", { useDefault: ["settings"] });

    const other = new Profiles();
    other.import(profiles.export("Lite"));

    expect(other.data("Lite").settings).toEqual({ tab_width: 2 });
    expect(other.data("Default").settings).toEqual({});
  });
});
