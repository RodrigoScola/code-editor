// What rename, code actions and refactorings send back (LSP WorkspaceEdit)
import type { EditorContext } from "../../Editor/EditorContext.js";
import type { TextEdit } from "./types.js";

// version must match the open document's (null = any)
export interface TextDocumentEdit {
  textDocument: { path: string; version: number | null };
  edits: TextEdit[];
}

export interface CreateFile {
  kind: "create";
  path: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
}

export interface RenameFile {
  kind: "rename";
  oldPath: string;
  newPath: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
}

export interface DeleteFile {
  kind: "delete";
  path: string;
  options?: { recursive?: boolean; ignoreIfNotExists?: boolean };
}

export interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
  // applied in order
  documentChanges?: (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[];
}

export interface ApplyWorkspaceEditResult {
  applied: boolean;
  failureReason?: string;
}

// open documents are edited in their editors; other files on disk
export function applyWorkspaceEdit(
  ctx: EditorContext,
  edit: WorkspaceEdit,
): ApplyWorkspaceEditResult {
  throw new Error("not implemented");
}
