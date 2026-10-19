import { EditorContext } from "../Editor/Editor/Editor.js";
import type { EditorCommand } from "./Commands.js";
import {
  isCodeEditorWindow,
  isFileTreeWindow,
  isTextComponent,
} from "../utils.js";
import { assert } from "../assert.js";
import { movementCommands } from "./editor/commands/movement.js";
import { CursorMovement } from "../ui/components/UiScreen/CursorMovement.js";

export const textEditorCommands = {
  textEditor: {
    deleteRight: {
      id: "textEditor.deleteRight",
      title: "Text Editor: Delete Right",
      description: "delete right of the cursor",
      run: deleteRight,
    },
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
      run: movementCommands.down,
    },
    moveUp: {
      id: "textEditor.moveUp",
      title: "Text Editor: Move Cursor Up",
      description: "Moves the cursor one line up, keeping its column (k).",
      run: movementCommands.up,
    },
    moveLeft: {
      id: "textEditor.moveLeft",
      title: "Text Editor: Move Cursor Left",
      description: "Moves the cursor one character left (h).",
      run: movementCommands.left,
    },
    moveRight: {
      id: "textEditor.moveRight",
      title: "Text Editor: Move Cursor Right",
      description: "Moves the cursor one character right (r).",
      run: movementCommands.right,
    },

    moveRightSelect: {
      id: "textEditor.moveRightSelect",
      title: "Text Editor: Start Selection and move Cursor Right",
      description:
        "Moves the cursor one character right (r) and starts a selection",
      run: movementCommands.rightSelect,
    },

    moveLeftSelect: {
      id: "textEditor.moveLeftSelect",
      title: "Text Editor: Start Selection and move Cursor left",
      description:
        "Moves the cursor one character left (l) and starts a selection",
      run: movementCommands.leftSelect,
    },

    moveUpSelect: {
      id: "textEditor.moveUpSelect",
      title: "Text Editor: Start Selection and move Cursor up",
      description:
        "Moves the cursor one character up (u) and starts a selection",
      run: movementCommands.upSelect,
    },

    moveDownSelect: {
      id: "textEditor.moveDowntSelect",
      title: "Text Editor: Start Selection and move Cursor down",
      description:
        "Moves the cursor one character down  (d) and starts a selection",
      run: movementCommands.downSelect,
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
    deleteLeft: {
      id: "textEditor.deleteLeft",
      title: "Text Editor: Delete left of  cursor",
      description: "deletes to the left",
      run: deleteLeft,
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
      run: movementCommands.nextWordStart,
    },
    nextCompleteWordStart: {
      id: "textEditor.nextCompleteWordStart",
      title: "Text Editor: Next WORD",
      description:
        "Jumps forward to the start of the next word, where words are split only by spaces (W).",
      run: movementCommands.nextCompleteWordStart,
    },

    nextWordStartSelect: {
      id: "textEditor.nextWordStartSelect",
      title: "Text Editor: Next Word",
      description:
        "start selection Jumps forward to the start of the next word (w).",
      run: movementCommands.nextWordStart,
    },
    nextCompleteWordStartSelect: {
      id: "textEditor.nextCompleteWordStartSelect",
      title: "Text Editor: Next WORD",
      description:
        "Jumps forward to the start of the next word, where words are split only by spaces (W).",
      run: movementCommands.nextCompleteWordStartSelect,
    },
    cursorEnd: {
      id: "textEditor.cursorEnd",
      title: "Text Editor: Go to End of Line",
      description: "Moves the cursor to the last character of the line ($).",
      run: movementCommands.endline,
    },

    cursorHome: {
      id: "textEditor.cursorHome",
      title: "Text Editor: Go to Start of Line",
      description: "Moves the cursor to the first column of the line (0).",
      run: movementCommands.cursorHome,
    },

    cursorEndSelect: {
      id: "textEditor.cursorEndSelect",
      title: "Text Editor: Start Selection and Go to End of Line",
      description:
        "Moves the cursor to the last character of the line ($). with selection",
      run: movementCommands.endlineSelect,
    },
    cursorHomeSelect: {
      id: "textEditor.cursorHomeSelect",
      title: "Text Editor: starts selection and Go to Start of Line",
      description: "Moves the cursor to the first column of the line (0).",
      run: movementCommands.cursorHomeSelect,
    },
    prevWordStart: {
      id: "textEditor.prevWordStart",
      title: "Text Editor: Previous Word",
      description: "Jumps back to the start of the word before the cursor (b).",
      run: movementCommands.prevWordStart,
    },

    prevWordStartSelect: {
      id: "textEditor.prevWordStartSelect",
      title: "Text Editor: Previous Word",
      description: "Jumps back to the start of the word before the cursor (b).",
      run: movementCommands.prevWordStartSelect,
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
function deleteRight(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  isTextComponent(editor);

  editor.deleteRight();
}
function deleteLeft(ctx: EditorContext) {
  const editor = ctx.getFocusedComponent();
  isTextComponent(editor);

  editor.deleteLeft();
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
    const input = editor.getNodeAt(cursor.line);
    assert(input, "invalid file on position " + cursor.line);
    ctx.focus(input);

    assert(input.isFocused(), `input is not focused?`);

    // select the whole name. Selections end before their last column, and
    // goToLineEnd stops on the last character, so set the end by hand
    const name = input.cursor();
    name.goToLineBeginning();
    name.startSelection();
    name.column = name.prefferedColumn = input.buffer().at(0)?.length ?? 0;
    name.updateSelection();

    assert(name.hasSelection(), `cursor has to have a selection`);

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
