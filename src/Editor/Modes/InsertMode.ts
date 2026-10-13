import { InputParser } from "../../Input/inputParser.js";
import { isTextComponent } from "../../utils.js";
import { EditorContext } from "../Editor/Editor.js";

export class InsertMode implements EditorMode {
  handleKey(key: KeyEvent, ctx: EditorContext) {
    const editor = ctx.getFocusedComponent();
    if (!editor) {
      return;
    }

    isTextComponent(editor);

    const cursor = editor.cursor();
    const buffer = editor.buffer();

    if (cursor.hasSelection() && !InputParser.isArrow(key.token)) {
      const selection = cursor.selection!;

      buffer.removeRange(selection.startSelection(), selection.endSelection());

      cursor.clearSelection();
      cursor.goToLineEnd();
    }

    if (InputParser.isSpace(key.token) || InputParser.isCharacter(key.token)) {
      if (key.token === "h" && key.ctrl) {
        cursor.column -= 1;
        cursor.prefferedColumn = cursor.column;
        buffer.remove(cursor.line, cursor.column);
        return;
      }
      let valid = key.shift ? key.token.toUpperCase() : key.token;
      buffer.addCharacter(cursor.line, cursor.column + 1, valid);
      cursor.moveRight();
    } else if (InputParser.isEscape(key.token)) {
      ctx.setMode("normal");
    } else if (InputParser.isBackspace(key.token)) {
      cursor.column -= 1;
      cursor.prefferedColumn = cursor.column;
      buffer.remove(cursor.line, cursor.column);
    } else if (InputParser.isDelete(key.token)) {
      buffer.remove(cursor.line, cursor.column);
    } else if (InputParser.isEnter(key.token)) {
      editor.onEnter(ctx);
    } else if (InputParser.isArrowDown(key.token)) {
      editor.moveCursorDown();
    } else if (InputParser.isArrowUp(key.token)) {
      editor.moveCursorUp();
    } else if (InputParser.isArrowLeft(key.token)) {
      editor.moveCursorLeft();
    } else if (InputParser.isArrowRight(key.token)) {
      editor.moveCursorRight();
    } else if (InputParser.isTab(key.token)) {
      buffer.addCharacter(cursor.line, cursor.column, "\t");
      cursor.column += 1;
      cursor.prefferedColumn = cursor.column;
    }
  }
}
