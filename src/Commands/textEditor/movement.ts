import { log } from "../../logging/fileLog.js";
import { EditorContext } from "../../Editor/EditorContext.js";
import { isTextComponent } from "../../utils.js";

function moveDownEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.endSelection();
  editor.moveCursorDown();
}

function moveUpEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.endSelection();
  editor.moveCursorUp();
}

function moveLeftEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  // with a selection, left only drops it, landing on its start
  if (editor.collapseSelection("start")) return;
  editor.moveCursorLeft();
}

function moveRightEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  // with a selection, right only drops it, landing on its end
  if (editor.collapseSelection("end")) return;
  editor.moveCursorRight();
}
function moveRightSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelectionIfNone();
  editor.moveCursorRight();
}

function moveLeftSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelectionIfNone();
  editor.moveCursorLeft();
}
function moveUpSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelectionIfNone();
  editor.moveCursorUp();
}
function moveDownSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelectionIfNone();
  editor.moveCursorDown();
}

function goToEndLine(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.endSelection();
  activeEditor.moveCursorEnd();
}
function goToEndLineSelect(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.startSelectionIfNone();
  activeEditor.moveCursorEnd();
}
function cursorHome(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.endSelection();
  activeEditor.moveCursorHome();
}
function cursorHomeSelect(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.startSelectionIfNone();
  activeEditor.moveCursorHome();
}
function prevWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);

  activeEditor.movePreviousWord();
}

function prevWordStartSelect(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.startSelectionIfNone();

  activeEditor.movePreviousWord();
}

function nextWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();

  if (!activeEditor) return;
  isTextComponent(activeEditor);
  activeEditor.moveNextWord();
}
function nextWordStartSelect(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();

  if (!activeEditor) return;
  isTextComponent(activeEditor);
  activeEditor.startSelectionIfNone();
  activeEditor.moveNextWord();
}
function nextCompleteWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.moveNextCompleteWord();
}
function nextCompleteWordStartSelect(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.startSelectionIfNone();
  activeEditor.moveNextCompleteWord();
}

// Vim's h $ 0: the cursor sits on a character (see CursorMovement)
function vimMoveLeftEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.vimMoveLeft();
}

function vimLineEnd(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.moveLineEnd();
}
function vimLineStart(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.moveLineStart();
}

export const movementCommands = {
  down: moveDownEditorCommand,
  up: moveUpEditorCommand,
  left: moveLeftEditorCommand,
  right: moveRightEditorCommand,
  rightSelect: moveRightSelectEditorCommand,
  leftSelect: moveLeftSelectEditorCommand,
  upSelect: moveUpSelectEditorCommand,
  downSelect: moveDownSelectEditorCommand,
  endline: goToEndLine,
  endlineSelect: goToEndLineSelect,
  cursorHome: cursorHome,
  cursorHomeSelect,
  prevWordStart: prevWordStart,
  prevWordStartSelect: prevWordStartSelect,
  nextWordStart,
  nextWordStartSelect,
  nextCompleteWordStart,
  nextCompleteWordStartSelect,
  vimLeft: vimMoveLeftEditorCommand,
  vimLineEnd,
  vimLineStart,
};
