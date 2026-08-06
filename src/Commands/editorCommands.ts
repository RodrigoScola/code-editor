import { EditorContext } from "../Editor/Editor.js";
import { isTextEditor } from "../utils.js";
import { log } from "../log.js";

export function moveDownEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveDown(ctx.activeWindow.document.buffer);
}

export function moveUpEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveUp(ctx.activeWindow.document.buffer);
}

export function moveLeftEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveLeft(ctx.activeWindow.document.buffer);
}

export function moveRightEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveRight(ctx.activeWindow.document.buffer);
}

export function editorInsertMode(ctx: EditorContext) {
  ctx.setMode("insert");
}
export function newLineEditorCommand(ctx: EditorContext) {
  isTextEditor(ctx.activeWindow);

  const cursor = ctx.activeWindow.cursor;
  const newLine = ctx.activeWindow.document.buffer.insertLine(cursor.line);

  cursor.line = newLine;
  cursor.column = 0;
  cursor.prefferedColumn = 0;

  ctx.setMode("insert");
}
export function setCommandMode(ctx: EditorContext) {
  ctx.setMode("command");
}

export function deleteLine(ctx: EditorContext) {
  isTextEditor(ctx.activeWindow);
  const buffer = ctx.activeWindow.document.buffer;
  const cursor = ctx.activeWindow.cursor;

  buffer.removeLine(cursor.line);
}

export function editorInsertModeAfter(ctx: EditorContext) {
  isTextEditor(ctx.activeWindow);

  ctx.activeWindow?.cursor.moveRight(ctx.activeWindow.document.buffer);
  ctx.setMode("insert");
}
