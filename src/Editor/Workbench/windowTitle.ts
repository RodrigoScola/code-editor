// The terminal title (window.title and window.titleSeparator), set with
// OSC 2
import type { WorkspaceFolder } from "../Workspace/workspace.js";

export interface WindowTitleState {
  // full path of the active editor
  activeFile?: string;
  // "Untitled-1" when it is untitled
  untitledName?: string;
  dirty?: boolean;
  folders: WorkspaceFolder[];
  // set for a .code-workspace
  workspaceName?: string;
  appName: string;
  // left out for the default profile
  profileName?: string;
  repository?: { name: string; branch: string };
}

export const DEFAULT_TITLE =
  "${dirty}${activeEditorShort}${separator}${rootName}${separator}${profileName}${separator}${appName}";

// unknown variables are left out; ${separator} only between two parts that
// have text; paths use "/"
export function windowTitle(template: string, state: WindowTitleState, separator = " - "): string {
  throw new Error("not implemented");
}
