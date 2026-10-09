import type { EditorContext } from "../Editor/Editor/Editor.js";
import type { EditorCommand } from "./Commands.js";

// Every command the editor can run, by id, so the same action can come from
// a key binding, an ex command or (later) the command palette.
//
// Not built yet: search(query) for the palette, see
// test/ide/workspace/command-palette.test.ts
export class CommandRegistry {
  private commands: Map<string, EditorCommand> = new Map();

  register(command: EditorCommand) {
    if (this.commands.has(command.id)) {
      throw new Error(`command ${command.id} is already registered`);
    }
    this.commands.set(command.id, command);
    return this;
  }

  get(id: string) {
    return this.commands.get(id);
  }

  all() {
    return [...this.commands.values()];
  }

  // returns false when no command has that id
  execute(id: string, ctx: EditorContext, args?: unknown) {
    const command = this.commands.get(id);
    if (!command) {
      return false;
    }

    if (args === undefined) {
      command.run(ctx);
    } else {
      command.run(ctx, args);
    }
    return true;
  }
}
