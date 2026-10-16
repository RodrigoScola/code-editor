// Auto-detected tasks

export interface DetectedTask {
  // "npm: build", "npm: build - packages/app", "tsc: watch - tsconfig.json"
  label: string;
  type: string;
  // "<package manager> run <script>"
  command: string;
  // the script itself
  detail?: string;
  group?: "build" | "test";
  // the folder of the package.json / tsconfig.json, relative to the root
  folder: string;
  isBackground?: boolean;
  problemMatcher?: string[];
}

// one per script in each package.json (node_modules skipped); the package
// manager comes from the lock file
export function detectNpmTasks(root: string, options: { exclude?: string[] }): DetectedTask[] {
  throw new Error("not implemented");
}

// "tsc: build" and "tsc: watch" for each tsconfig.json
export function detectTypeScriptTasks(root: string): DetectedTask[] {
  throw new Error("not implemented");
}
