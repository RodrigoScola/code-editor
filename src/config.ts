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
