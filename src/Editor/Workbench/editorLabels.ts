// Tab labels

export interface TabLabel {
  name: string;
  // only when names repeat: enough of the folder to tell them apart
  description: string | undefined;
}

export function tabLabels(paths: string[]): TabLabel[] {
  throw new Error("not implemented");
}

// workbench.editor.customLabels.patterns: ${filename} (no extension),
// ${extname}, ${dirname}, ${dirname(N)}; undefined when no pattern matches
export function customLabel(path: string, patterns: Record<string, string>): string | undefined {
  throw new Error("not implemented");
}
