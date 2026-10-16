// Every edit in one batch refers to the text before any of them is applied;
// overlapping edits are an error
import type { TextBuffer } from "../../ui/buffer/Buffer.js";
import type { TextEdit } from "./types.js";

export function applyTextEdits(buffer: TextBuffer, edits: TextEdit[]): void {
  throw new Error("not implemented");
}
