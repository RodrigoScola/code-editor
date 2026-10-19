import { log } from "../../../log.js";
import { EditorContext } from "../../../Editor/Editor/Editor.js";
import { isTextComponent } from "../../../utils.js";

function moveDownEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.moveCursorDown();
}

function moveUpEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.moveCursorUp();
}

function moveLeftEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.moveCursorLeft();
}

function moveRightEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.moveCursorRight();
}
function moveRightSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelection();
  editor.moveCursorRight();
}

function moveLeftSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelection();
  editor.moveCursorLeft();
}
function moveUpSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelection();
  editor.moveCursorUp();
}
function moveDownSelectEditorCommand(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  if (!editor) {
    log("invalid active window");
    return;
  }
  isTextComponent(editor);
  editor.startSelection();
  editor.moveCursorUp();
}

function goToEndLine(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.moveCursorEnd();
}
function goToEndLineSelect(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.startSelection();
  activeEditor.moveCursorEnd();
}
function cursorHome(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.moveCursorHome();
}
function cursorHomeSelect(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.startSelection();
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
  activeEditor.startSelection();

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
  activeEditor.startSelection();
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
  activeEditor.startSelection();
  activeEditor.moveNextCompleteWord();
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
};
