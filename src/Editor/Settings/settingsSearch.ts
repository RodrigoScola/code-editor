// The Settings editor's search box

export interface SettingInfo {
  id: string;
  title: string;
  description: string;
  // explorer, terminal, ...
  feature: string;
  // "advanced" ones are hidden unless @tag:advanced asks for them
  tags?: string[];
  languageOverridable?: boolean;
}

// every plain word has to appear in the id, title or description;
// @modified @id: @lang: @tag: @feature: filter, and combine with words
export function searchSettings<S extends SettingInfo>(
  settings: S[],
  query: string,
  options: { modified: Set<string>; languages?: string[] },
): S[] {
  throw new Error("not implemented");
}

// "vscode://settings/editor.tabSize" -> "editor.tabSize"
export function parseSettingsUrl(url: string): string | undefined {
  throw new Error("not implemented");
}

// '"editor.tabSize": 4'
export function copyAsJson(id: string, value: unknown): string {
  throw new Error("not implemented");
}
