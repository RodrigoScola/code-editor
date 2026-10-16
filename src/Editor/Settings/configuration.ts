// Settings with VS Code's scopes: default < user < workspace < folder <
// language-specific < policy

export type SettingScope =
  | "application"
  | "machine"
  | "window"
  | "resource"
  | "language-overridable"
  | "machine-overridable";

export interface SettingSchema {
  // can't be set in a workspace (git.path)
  restricted?: boolean;
  // a folder can only set "resource" scoped settings
  scope?: SettingScope | (string & {});
}

export interface ConfigurationOptions {
  defaults: Record<string, unknown>;
  schema?: Record<string, SettingSchema>;
}

export interface SettingInspection<T = unknown> {
  defaultValue?: T;
  userValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
  policyValue?: T;
  defaultLanguageValue?: T;
  userLanguageValue?: T;
  workspaceLanguageValue?: T;
  workspaceFolderLanguageValue?: T;
}

export interface ConfigurationChangeEvent {
  // "editor" or "editor.tabSize"
  affects(section: string): boolean;
}

export class Configuration {
  constructor(options: ConfigurationOptions) {}

  // "editor.tabSize" and { editor: { tabSize } } mean the same;
  // "[javascript][typescript]" blocks hold language values
  setLayer(layer: "user" | "workspace" | "policy", values: Record<string, unknown>): void {
    throw new Error("not implemented");
  }

  setFolderLayer(folder: string, values: Record<string, unknown>): void {
    throw new Error("not implemented");
  }

  // objects are merged across scopes, arrays and primitives replaced
  get<T = unknown>(key: string, overrides: { language?: string; folder?: string } = {}): T {
    throw new Error("not implemented");
  }

  inspect<T = unknown>(key: string): SettingInspection<T> {
    throw new Error("not implemented");
  }

  // undefined removes it from the layer
  update(key: string, value: unknown, target: "user" | "workspace" = "user"): void {
    throw new Error("not implemented");
  }

  // returns a function that unsubscribes
  onDidChange(listener: (event: ConfigurationChangeEvent) => void): () => void {
    throw new Error("not implemented");
  }
}
