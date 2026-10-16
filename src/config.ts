// kept free of editor/ui imports so any layer can read config without
// creating an import cycle
export type EditorConfig = {
  tab_width: number;
};

const defaultConfig: EditorConfig = {
  tab_width: 4,
};

let current: EditorConfig = defaultConfig;

export function Configuration(): EditorConfig {
  return current;
}

export function setConfiguration(config: EditorConfig) {
  current = config;
}

// each layer is the text of a JSON settings file (comments and trailing
// commas allowed), later layers win; a broken layer, unknown keys and
// values of the wrong type are reported in errors and skipped
export function loadSettings(layers: string[]): { settings: EditorConfig; errors: string[] } {
  throw new Error("not implemented");
}
