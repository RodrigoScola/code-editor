import { EditorContext } from "../ui/Editor.js";
import { isTextEditor } from "../utils.js";
import { log } from "../log.js";

export function moveDownEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveDown(ctx.activeWindow.buffer);
}

export function moveUpEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveUp(ctx.activeWindow.buffer);
}

export function moveLeftEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveLeft(ctx.activeWindow.buffer);
}

export function moveRightEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isTextEditor(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveRight(ctx.activeWindow.buffer);
}

export function editorInsertMode(ctx: EditorContext) {
  ctx.setMode("insert");
}
export function newLineEditorCommand(ctx: EditorContext) {
  isTextEditor(ctx.activeWindow);

  const cursor = ctx.activeWindow.cursor;
  const newLine = ctx.activeWindow.buffer.insertLine(cursor.line);

  cursor.line = newLine;
  cursor.column = 0;
  cursor.prefferedColumn = 0;

  ctx.setMode("insert");
}

export function editorInsertModeAfter(ctx: EditorContext) {
  isTextEditor(ctx.activeWindow);

  ctx.activeWindow?.cursor.moveRight(ctx.activeWindow.buffer);
  ctx.setMode("insert");
}
