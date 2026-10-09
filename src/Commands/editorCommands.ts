import path from "path";
import { EditorContext } from "../Editor/Editor/Editor.js";
import type { EditorCommand } from "./Commands.js";
import {
  isCodeEditorWindow,
  isFileTreeWindow,
  isTextComponent,
} from "../utils.js";
import { log } from "../log.js";
import { assert } from "../assert.js";
import { isatty } from "node:tty";
import { UiInput } from "../ui/components/UiInput.js";
import { TreeInput } from "../Editor/windows/FileTreeWindow.js";
import { dir } from "node:console";

export const textEditorCommands = {
  textEditor: {
    saveFile: {
      id: "textEditor.saveFile",
      title: "Text Editor: Save File",
      description: "Writes the focused document to disk (:w).",
      run: saveFileCommand,
    },
    moveDown: {
      id: "textEditor.moveDown",
      title: "Text Editor: Move Cursor Down",
      description: "Moves the cursor one line down, keeping its column (j).",
      run: moveDownEditorCommand,
    },
    moveUp: {
      id: "textEditor.moveUp",
      title: "Text Editor: Move Cursor Up",
      description: "Moves the cursor one line up, keeping its column (k).",
      run: moveUpEditorCommand,
    },
    moveLeft: {
      id: "textEditor.moveLeft",
      title: "Text Editor: Move Cursor Left",
      description: "Moves the cursor one character left (h).",
      run: moveLeftEditorCommand,
    },
    moveRight: {
      id: "textEditor.moveRight",
      title: "Text Editor: Move Cursor Right",
      description: "Moves the cursor one character right (l).",
      run: moveRightEditorCommand,
    },
    insertMode: {
      id: "textEditor.insertMode",
      title: "Text Editor: Insert Before Cursor",
      description: "Switches to insert mode at the cursor (i).",
      run: editorInsertMode,
    },
    newLine: {
      id: "textEditor.newLine",
      title: "Text Editor: Open Line Below",
      description:
        "Adds an empty line below the cursor and starts typing on it (o).",
      run: newLineEditorCommand,
    },
    commandMode: {
      id: "textEditor.commandMode",
      title: "Text Editor: Command Line",
      description:
        "Moves focus to the status line to type a command, like :w (:).",
      run: setCommandMode,
    },
    deleteLine: {
      id: "textEditor.deleteLine",
      title: "Text Editor: Delete Line",
      description: "Deletes the line the cursor is on (dd).",
      run: deleteLine,
    },
    insertAfter: {
      id: "textEditor.insertAfter",
      title: "Text Editor: Insert After Cursor",
      description:
        "Switches to insert mode after the cursor (a). In the file tree it starts a new file instead.",
      run: editorInsertModeAfter,
    },
    renameCharacter: {
      id: "textEditor.rename",
      title: "Text Editor: Rename",
      description: "renames files or characters in editor",
      run: renameCharacter,
    },
    nextWordStart: {
      id: "textEditor.nextWordStart",
      title: "Text Editor: Next Word",
      description: "Jumps forward to the start of the next word (w).",
      run: nextWordStart,
    },
    nextCompleteWordStart: {
      id: "textEditor.nextCompleteWordStart",
      title: "Text Editor: Next WORD",
      description:
        "Jumps forward to the start of the next word, where words are split only by spaces (W).",
      run: nextCompleteWordStart,
    },
    goToEndLine: {
      id: "textEditor.goToEndLine",
      title: "Text Editor: Go to End of Line",
      description: "Moves the cursor to the last character of the line ($).",
      run: goToEndLine,
    },
    goToBeginLine: {
      id: "textEditor.goToBeginLine",
      title: "Text Editor: Go to Start of Line",
      description: "Moves the cursor to the first column of the line (0).",
      run: goToBeginLine,
    },
    prevWordStart: {
      id: "textEditor.prevWordStart",
      title: "Text Editor: Previous Word",
      description: "Jumps back to the start of the word before the cursor (b).",
      run: prevWordStart,
    },
    goToDocumentStart: {
      id: "textEditor.goToDocumentStart",
      title: "Text Editor: Go to First Line",
      description: "Moves the cursor to the first line of the document (gg).",
      run: goToDocumentStart,
    },
    goToDocumentEnd: {
      id: "textEditor.goToDocumentEnd",
      title: "Text Editor: Go to Last Line",
      description: "Moves the cursor to the last line of the document (G).",
      run: goToDocumentEnd,
    },
  },
} satisfies Record<string, Record<string, EditorCommand>>;

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

function editorInsertMode(ctx: EditorContext) {
  ctx.setMode("insert");
}
function newLineEditorCommand(ctx: EditorContext) {
  const window = ctx.getFocusedComponent();
  isTextComponent(window);

  const cursor = window.cursor();
  const newLine = window.buffer().insertLine(cursor.line);

  cursor.line = newLine;
  cursor.column = 0;
  cursor.prefferedColumn = 0;

  ctx.setMode("insert");
}
function setCommandMode(ctx: EditorContext) {
  ctx.setMode("command");
}

function deleteLine(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  isTextComponent(editor);
  const cursor = editor.cursor();
  if (isFileTreeWindow(editor)) {
    editor.deleteNodeAt(cursor.line, ctx);
    return;
  }

  editor.removeLine(cursor.line);
}

function renameCharacter(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  isTextComponent(editor);

  const cursor = editor.cursor();

  if (isFileTreeWindow(editor)) {
    const file = editor.getNodeAt(cursor.line);
    assert(file, "invalid file on position " + cursor.line);
    ctx.focus(file);
    cursor.goToLineBeginning();
    cursor.startSelection();
    cursor.goToLineEnd();
    cursor.selection?.setHead({ x: cursor.column + 1, y: cursor.line }); // end is exclusive

    ctx.setMode("insert");
  }
}

function editorInsertModeAfter(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  isTextComponent(editor);

  const cursor = editor.cursor();

  if (isFileTreeWindow(editor)) {
    const file = editor.createNewFileInput();

    ctx.focus(file);
    ctx.setMode("insert");
    return;
  }

  const buffer = editor.buffer();
  // check if at the end of the line

  const line = buffer.at(cursor.line);
  assert(line !== undefined, `invalid line at ${cursor.line}`);
  if (!line.endsWith(" ")) {
    buffer.update(cursor.line, line + " ");
  }
  editor.moveCursorRight();

  ctx.setMode("insert");
}

function saveFileCommand(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isCodeEditorWindow(activeEditor);

  activeEditor.save();
}

function nextWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();

  if (!activeEditor) return;
  isTextComponent(activeEditor);

  const buffer = activeEditor.buffer();
  const cursor = activeEditor.cursor();

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
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);

  const buffer = activeEditor.buffer();
  const cursor = activeEditor.cursor();

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
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);

  activeEditor.cursor().goToLineEnd();
}
function goToBeginLine(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);
  activeEditor.cursor().goToLineBeginning();
}

function prevWordStart(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  isTextComponent(activeEditor);

  const buffer = activeEditor.buffer();
  const cursor = activeEditor.cursor();

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
  const activeEditor = ctx.getFocusedComponent();
  if (!activeEditor) return;

  isTextComponent(activeEditor);
  activeEditor.cursor().reset();
}
function goToDocumentEnd(ctx: EditorContext) {
  const activeEditor = ctx.getFocusedComponent();
  if (!activeEditor) return;
  isTextComponent(activeEditor);

  activeEditor.cursor().goToLineEnd();
}

function nextWordEnd(ctx: EditorContext) {}
function nextCompleteWordEnd(ctx: EditorContext) {}
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
