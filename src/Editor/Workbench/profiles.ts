// Profiles: named sets of settings, keybindings, snippets, tasks and UI
// state, switched as a whole
import type { KeybindingRule } from "../Keybindings/resolver.js";

export type ProfilePart = "settings" | "keybindings" | "snippets" | "tasks" | "uiState";

export interface ProfileSnippet {
  prefix: string | string[];
  body: string | string[];
  description?: string;
}

export interface ProfileData {
  settings: Record<string, unknown>;
  keybindings: KeybindingRule[];
  // language -> name -> snippet
  snippets: Record<string, Record<string, ProfileSnippet>>;
  tasks: Record<string, unknown>[];
  uiState: Record<string, unknown>;
}

export class Profiles {
  // starts with "Default", active

  // "Default" first, the rest in creation order
  list(): string[] {
    throw new Error("not implemented");
  }

  // names are unique ignoring case, not empty; useDefault parts are shared
  // with Default instead of the profile's own
  create(name: string, options: { from?: string; useDefault?: ProfilePart[] } = {}): void {
    throw new Error("not implemented");
  }

  // Default can't be renamed
  rename(name: string, newName: string): void {
    throw new Error("not implemented");
  }

  // Default can't be deleted; deleting the active one switches to Default
  // and forgets the folders that used it
  delete(name: string): void {
    throw new Error("not implemented");
  }

  // changing a shared part changes Default's
  data(name: string): ProfileData {
    throw new Error("not implemented");
  }

  active(): string {
    throw new Error("not implemented");
  }

  use(name: string): void {
    throw new Error("not implemented");
  }

  setForWorkspace(folder: string, name: string): void {
    throw new Error("not implemented");
  }

  // "Default" when none was set
  forWorkspace(folder: string): string {
    throw new Error("not implemented");
  }

  // JSON text; shared parts carry Default's data
  export(name: string): string {
    throw new Error("not implemented");
  }

  // refuses an existing name
  import(text: string, name?: string): void {
    throw new Error("not implemented");
  }
}
