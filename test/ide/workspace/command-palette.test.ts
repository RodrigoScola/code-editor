import { describe, expect, it, vi } from "vitest";
import { CommandRegistry } from "../../../src/Commands/CommandRegistry.js";

// Proposed module src/Commands/CommandRegistry.ts. Every action the editor
// can do gets an id and a title, so the same action can be run from a key
// binding, an ex command or the command palette (VS Code's Ctrl+Shift+P).
//
//   registry.register({ id, title, run(ctx), keybinding? })
//   registry.get(id) / registry.all()
//   registry.execute(id, ctx) -> true when it ran
//   registry.search(query) -> commands, best fuzzy match on the title
//                             first; with an empty query the most recently
//                             run come first

const ctx = {} as never;

function registry() {
  const commands = new CommandRegistry();
  commands.register({ id: "file.save", title: "File: Save", run: vi.fn() });
  commands.register({ id: "file.close", title: "File: Close", run: vi.fn() });
  commands.register({ id: "view.split", title: "View: Split Right", run: vi.fn() });
  return commands;
}

describe("CommandRegistry", () => {
  it("runs a command by id", () => {
    const commands = registry();

    expect(commands.execute("file.save", ctx)).eq(true);
    expect(commands.get("file.save")!.run).toHaveBeenCalledWith(ctx);
  });

  it("returns false for an unknown id", () => {
    expect(registry().execute("nope", ctx)).eq(false);
  });

  it("refuses two commands with the same id", () => {
    const commands = registry();

    expect(() =>
      commands.register({ id: "file.save", title: "Again", run: () => {} }),
    ).toThrow();
  });

  it("lists every command", () => {
    expect(registry().all().map((command) => command.id)).toEqual([
      "file.save",
      "file.close",
      "view.split",
    ]);
  });

  it("searches titles fuzzily", () => {
    expect(registry().search("splr").map((command) => command.id)).toEqual([
      "view.split",
    ]);
  });

  it("ranks the best match first", () => {
    expect(registry().search("save")[0].id).eq("file.save");
  });

  it("puts recently run commands first when nothing is typed", () => {
    const commands = registry();

    commands.execute("view.split", ctx);

    expect(commands.search("")[0].id).eq("view.split");
  });

  it("keeps the key binding to show next to the title", () => {
    const commands = new CommandRegistry();
    commands.register({ id: "a", title: "A", run: () => {}, keybinding: "<C-s>" });

    expect(commands.get("a")!.keybinding).eq("<C-s>");
  });
});
