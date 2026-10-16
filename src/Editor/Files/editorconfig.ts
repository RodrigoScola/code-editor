// EditorConfig (https://editorconfig.org)

// keys and the values true, false, tab, space, lf, crlf, unset lowercased
export type EditorConfigProperties = {
  indent_style?: string;
  indent_size?: string;
  tab_width?: string;
  end_of_line?: string;
  charset?: string;
  trim_trailing_whitespace?: string;
  insert_final_newline?: string;
  [key: string]: string | undefined;
};

export interface EditorConfigFile {
  root: boolean;
  sections: { glob: string; properties: EditorConfigProperties }[];
}

// ini format; "#" and ";" start comments
export function parseEditorConfig(text: string): EditorConfigFile {
  throw new Error("not implemented");
}

// reads .editorconfig from the file's folder upwards, stopping after one
// with root = true; nearer files and later sections win; "unset" removes
export function editorConfigFor(filePath: string): EditorConfigProperties {
  throw new Error("not implemented");
}
