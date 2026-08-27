import { EditorContext } from "../Editor/Editor.js";
import { isEditorWindow } from "../utils.js";
import { log } from "../log.js";
import { assert } from "../assert.js";

export const textEditorCommands = {
  textEditor: {
    saveFile: saveFileCommand,
    moveDown: moveDownEditorCommand,
    moveUp: moveUpEditorCommand,
    moveLeft: moveLeftEditorCommand,
    moveRight: moveRightEditorCommand,
    insertMode: editorInsertMode,
    newLine: newLineEditorCommand,
    commandMode: setCommandMode,
    deleteLine: deleteLine,
    insertAfter: editorInsertModeAfter,
    nextWordStart: nextWordStart,
    nextCompleteWordStart: nextCompleteWordStart,
    goToEndLine,
    goToBeginLine,
    prevWordStart,
    goToDocumentStart,
    goToDocumentEnd,
  },
};

function moveDownEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isEditorWindow(ctx.activeWindow);
  ctx.activeWindow.moveCursorDown();
}

function moveUpEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isEditorWindow(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveUp(ctx.activeWindow.buffer);
}

function moveLeftEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isEditorWindow(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveLeft(ctx.activeWindow.buffer);
}

function moveRightEditorCommand(ctx: EditorContext) {
  if (!ctx.activeWindow) {
    log("invalid active window");
    return;
  }
  isEditorWindow(ctx.activeWindow);
  const cursor = ctx.activeWindow.cursor;
  cursor.moveRight(ctx.activeWindow.buffer);
}

function editorInsertMode(ctx: EditorContext) {
  ctx.setMode("insert");
}
function newLineEditorCommand(ctx: EditorContext) {
  isEditorWindow(ctx.activeWindow);

  const cursor = ctx.activeWindow.cursor;
  const newLine = ctx.activeWindow.buffer.insertLine(cursor.line);

  cursor.line = newLine;
  cursor.column = 0;
  cursor.prefferedColumn = 0;

  ctx.setMode("insert");
}
function setCommandMode(ctx: EditorContext) {
  ctx.setMode("command");
}

function deleteLine(ctx: EditorContext) {
  isEditorWindow(ctx.activeWindow);
  const buffer = ctx.activeWindow.buffer;
  const cursor = ctx.activeWindow.cursor;

  buffer.removeLine(cursor.line);
}

function editorInsertModeAfter(ctx: EditorContext) {
  isEditorWindow(ctx.activeWindow);

  const buffer = ctx.activeWindow.buffer;
  const cursor = ctx.activeWindow.cursor;
  // check if at the end of the line

  const line = buffer.at(cursor.line);
  assert(line, "invalid line");
  if (!line.endsWith(" ")) {
    buffer.update(cursor.line, line + " ");
  }

  ctx.activeWindow?.cursor.moveRight(ctx.activeWindow.buffer);
  ctx.setMode("insert");
}

function saveFileCommand(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  activeEditor.save();
}

function nextWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  const buffer = activeEditor.buffer;
  const cursor = activeEditor.cursor;

  const currentLine = buffer.at(cursor.line);
  assert(
    currentLine !== undefined,
    "invalid line to go to the next word command",
  );

  let nextColumn = cursor.column;

  if (nextColumn >= currentLine.length) {
    const nextLine = buffer.at(cursor.line + 1);
    if (nextLine !== undefined) {
      cursor.line += 1;
      cursor.column = 0;
      cursor.prefferedColumn = 0;
      return;
    }

    cursor.column = Math.max(0, currentLine.length - 1);
    cursor.prefferedColumn = cursor.column;
    return;
  }

  const initialChar = currentLine[nextColumn];
  if (isWhitespace(initialChar)) {
    while (
      nextColumn < currentLine.length &&
      isWhitespace(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }
  } else if (isWordChar(currentLine[nextColumn])) {
    while (
      nextColumn < currentLine.length &&
      isWordChar(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }

    while (
      nextColumn < currentLine.length &&
      isWhitespace(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }
  } else {
    while (
      nextColumn < currentLine.length &&
      !isWordChar(currentLine[nextColumn]) &&
      !isWhitespace(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }

    while (
      nextColumn < currentLine.length &&
      isWhitespace(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }
  }

  if (nextColumn >= currentLine.length) {
    const nextLine = buffer.at(cursor.line + 1);
    if (nextLine !== undefined) {
      cursor.line += 1;
      cursor.column = 0;
      cursor.prefferedColumn = 0;
      return;
    }
  }

  cursor.column = Math.max(
    0,
    Math.min(nextColumn, Math.max(currentLine.length - 1, 0)),
  );
  cursor.prefferedColumn = cursor.column;
}
function nextCompleteWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  const buffer = activeEditor.buffer;
  const cursor = activeEditor.cursor;

  const currentLine = buffer.at(cursor.line);
  assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

  let nextColumn = cursor.column;

  if (nextColumn >= currentLine.length) {
    cursor.column = Math.max(0, currentLine.length - 1);
    cursor.prefferedColumn = cursor.column;
    return;
  }

  if (/\s/.test(currentLine[nextColumn])) {
    while (
      nextColumn < currentLine.length &&
      /\s/.test(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }
  } else {
    while (
      nextColumn < currentLine.length &&
      !/\s/.test(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }

    while (
      nextColumn < currentLine.length &&
      /\s/.test(currentLine[nextColumn])
    ) {
      nextColumn += 1;
    }
  }

  cursor.column = Math.max(
    0,
    Math.min(nextColumn, Math.max(currentLine.length - 1, 0)),
  );
  cursor.prefferedColumn = cursor.column;
}

function isWhitespace(char: string | undefined) {
  return /\s/.test(char ?? "");
}

function isWordChar(char: string | undefined) {
  return /\w/.test(char ?? "");
}

function goToEndLine(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  const buffer = activeEditor.buffer;
  const cursor = activeEditor.cursor;

  const currentLine = buffer.at(cursor.line);
  assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

  cursor.column = currentLine.length - 1;
}
function goToBeginLine(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  const buffer = activeEditor.buffer;
  const cursor = activeEditor.cursor;

  const currentLine = buffer.at(cursor.line);
  assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

  cursor.column = 0;
}

function nextWordEnd(ctx: EditorContext) {}
function nextCompleteWordEnd(ctx: EditorContext) {}

function prevWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  const buffer = activeEditor.buffer;
  const cursor = activeEditor.cursor;

  const currentLine = buffer.at(cursor.line);

  assert(
    currentLine !== undefined,
    "invalid line to go to the previous word command",
  );

  let column = cursor.column;

  // Move left at least once.
  if (column > 0) {
    column--;
  } else {
    // At the beginning of the line: go to previous line.
    const prevLine = buffer.at(cursor.line - 1);

    if (prevLine !== undefined) {
      cursor.line--;
      cursor.column = Math.max(0, prevLine.length - 1);
      cursor.prefferedColumn = cursor.column;
    }

    return;
  }

  // Skip whitespace.
  while (column > 0 && isWhitespace(currentLine[column])) {
    column--;
  }

  // If we're inside a word, move to its beginning.
  if (isWordChar(currentLine[column])) {
    while (column > 0 && isWordChar(currentLine[column - 1])) {
      column--;
    }
  } else {
    // We're on punctuation.
    // Move across punctuation until we reach whitespace,
    // then find the beginning of the previous word.
    while (column > 0 && !isWhitespace(currentLine[column - 1])) {
      column--;
    }

    while (column > 0 && isWhitespace(currentLine[column - 1])) {
      column--;
    }

    if (isWordChar(currentLine[column])) {
      while (column > 0 && isWordChar(currentLine[column - 1])) {
        column--;
      }
    }
  }

  cursor.column = column;
  cursor.prefferedColumn = column;
}
function goToDocumentStart(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  const cursor = activeEditor.cursor;

  cursor.line = 0;
  cursor.column = 0;
}
function goToDocumentEnd(ctx: EditorContext) {
  const activeEditor = ctx.getActiveTextEditor();
  const cursor = activeEditor.cursor;
  const buffer = activeEditor.buffer;

  cursor.line = Math.max(buffer.count() - 1, 0);
  cursor.column = 0;
}

function prevCompleteWord(ctx: EditorContext) {}

// ✅w - jump forwards to the start of a word
// W - jump forwards to the start of a word (words can contain punctuation)
// e - jump forwards to the end of a word
// E - jump forwards to the end of a word (words can contain punctuation)
// ✅b - jump backwards to the start of a word
// B - jump backwards to the start of a word (words can contain punctuation)

// ✅G - go to the last line of the document
// ✅gg - go to the first line of the document
// ✅  h - move cursor left
// ✅ j - move cursor down
// ✅ k - move cursor up
// ✅ l - move cursor right
// ✅$ - jump to the end of the line
//✅ 0 - jump to the start of the line

// gj - move cursor down (multi-line text)
// gk - move cursor up (multi-line text)
// H - move to top of screen
// M - move to middle of screen
// L - move to bottom of screen
// ge - jump backwards to the end of a word
// gE - jump backwards to the end of a word (words can contain punctuation)
// % - move cursor to matching character (default supported pairs: '()', '{}', '[]' - use :h matchpairs in vim for more info)
// ^ - jump to the first non-blank character of the line
// g_ - jump to the last non-blank character of the line
// 5gg or 5G - go to line 5
// gd - move to local declaration
// gD - move to global declaration
// fx - jump to next occurrence of character x
// tx - jump to before next occurrence of character x
// Fx - jump to the previous occurrence of character x
// Tx - jump to after previous occurrence of character x
// ; - repeat previous f, t, F or T movement
// , - repeat previous f, t, F or T movement, backwards
// } - jump to next paragraph (or function/block, when editing code)
// { - jump to previous paragraph (or function/block, when editing code)
// zz - center cursor on screen
// zt - position cursor on top of the screen
// zb - position cursor on bottom of the screen
// Ctrl + e - move screen down one line (without moving cursor)
// Ctrl + y - move screen up one line (without moving cursor)
// Ctrl + b - move screen up one page (cursor to last line)
// Ctrl + f - move screen down one page (cursor to first line)
// Ctrl + d - move cursor and screen down 1/2 page
// Ctrl + u - move cursor and screen up 1/2 page
