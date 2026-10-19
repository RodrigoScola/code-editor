import { assert } from "../../../assert.js";
import { Cursor } from "../../../Editor/Cursor.js";

export class CursorMovement {
  private readonly cursor: Cursor;
  constructor(cursor: Cursor) {
    this.cursor = cursor;
  }
  moveTo(line: number, column: number) {
    const cursor = this.cursor;
    const buffer = this.cursor.buffer();
    if (!buffer) {
      return;
    }

    cursor.line = Math.max(Math.min(line, buffer.count() - 1), 0);
    const length = buffer.at(cursor.line)?.length ?? 0;
    cursor.column = Math.max(Math.min(column, length), 0);
    cursor.prefferedColumn = cursor.column;

    cursor.selection && cursor.updateSelection();
  }
  home() {
    this.cursor.line = 0;
    this.cursor.column = 0;
    this.cursor.prefferedColumn = 0;
    this.cursor.selection && this.cursor.updateSelection();
  }
  right() {
    const cursor = this.cursor;

    const buffer = cursor.buffer();
    if (!buffer) {
      return;
    }

    const line = buffer.at(cursor.line);

    let bufferLine = line?.length;

    if (bufferLine) {
      bufferLine -= 1;
    }

    const lineLength = bufferLine ?? cursor.column + 1;

    cursor.column = Math.min(cursor.column + 1, Math.max(lineLength, 0));

    cursor.prefferedColumn = cursor.column;

    if (cursor.selection) cursor.updateSelection();
    return cursor;
  }

  left() {
    const cursor = this.cursor;

    cursor.column = Math.max(cursor.column - 1, 0);

    if (cursor.selection) cursor.updateSelection();
    return cursor;
  }

  up() {
    const cursor = this.cursor;
    const buffer = cursor.buffer();

    if (!buffer) {
      return cursor;
    }

    cursor.line = Math.max(cursor.line - 1, 0);

    let nextLinePos = cursor.prefferedColumn;

    const line = buffer.at(cursor.line);
    if (line) {
      nextLinePos = line.length - 1;
    } else {
      nextLinePos = 0;
    }

    cursor.column = Math.min(cursor.prefferedColumn, nextLinePos);

    if (cursor.selection) cursor.updateSelection();
    return cursor;
  }

  down() {
    const cursor = this.cursor;
    const buffer = cursor.buffer();
    if (!buffer) {
      return this;
    }

    cursor.line = Math.max(Math.min(cursor.line + 1, buffer.count() - 1), 0);

    let nextLinePos = cursor.prefferedColumn;

    const line = buffer.at(cursor.line);
    if (line) {
      nextLinePos = line.length - 1;
    } else {
      nextLinePos = 0;
    }

    cursor.column = Math.min(cursor.prefferedColumn, nextLinePos);

    cursor.selection && cursor.updateSelection();

    return cursor;
  }

  moveDown(cursor: Cursor) {
    this.down();

    if (cursor.atLastLine()) {
      cursor.goToLineEnd();
    }
  }
  moveUp(cursor: Cursor) {
    if (cursor.atLineStart()) {
      cursor.moveUp();
      return;
    }
    cursor.moveUp().goToLineBeginning();
  }
  moveLeft() {
    this.cursor.moveLeft();
  }
  moveRight() {
    const cursor = this.cursor;
    if (!cursor.atLineEnd()) {
      cursor.moveRight();
      return;
    }
    cursor.moveDown().goToLineBeginning();
  }
  moveHome() {
    const cursor = this.cursor;
    if (!cursor.atLineStart()) {
      cursor.goToLineBeginning();
      return;
    }
    this.home();
  }

  lineEnd() {
    const cursor = this.cursor;
    const buffer = cursor.buffer();
    if (!buffer) {
      return;
    }

    const currentLine = buffer.at(cursor.line);
    assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

    cursor.prefferedColumn = cursor.column = Math.max(currentLine.length, 0);

    cursor.selection && cursor.updateSelection();
    return cursor;
  }

  lineBeginning() {
    const cursor = this.cursor;
    const buffer = cursor.buffer();
    if (!buffer) {
      return;
    }

    const currentLine = buffer.at(cursor.line);
    assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

    cursor.column = 0;
    cursor.prefferedColumn = 0;

    cursor.selection && cursor.updateSelection();
    return cursor;
  }

  goEnd() {
    const cursor = this.cursor
    cursor.line = cursor.buffer()?.count() || 0;
    cursor.goToLineEnd();

    cursor.selection && cursor.updateSelection();
  }

  moveEnd() {
    const cursor = this.cursor;
    if (!cursor.atLineEnd()) {
      cursor.goToLineEnd();
      return;
    }
    cursor.goEnd();
  }
  nextCompleteWordStart() {
    const cursor = this.cursor;
    const buffer = cursor.buffer();
    if (!buffer) {
      return;
    }

    const currentLine = buffer.at(cursor.line);
    assert(currentLine !== undefined, `invalid current line: ${cursor.line}`);

    let nextColumn = cursor.column;

    if (nextColumn >= currentLine.length) {
      cursor.column = Math.max(0, currentLine.length - 1);
      cursor.prefferedColumn = cursor.column;
      return;
    }

    if (isWhitespace(currentLine[nextColumn])) {
      while (
        nextColumn < currentLine.length &&
        isWhitespace(currentLine[nextColumn])
      ) {
        nextColumn += 1;
      }
    } else {
      while (
        nextColumn < currentLine.length &&
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
    const target = Math.max(
      0,
      Math.min(nextColumn, Math.max(currentLine.length - 1, 0)),
    );

    cursor.moveTo(cursor.line, target);
  }
  previousWordStart() {
    const cursor = this.cursor;
    const buffer = cursor.buffer();
    if (!buffer) {
      return;
    }

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

    cursor.moveTo(cursor.line, column);
  }
  nextWord() {
    const cursor = this.cursor;
    const buffer = cursor.buffer();
    if (!buffer) {
      return;
    }

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
}

function isWhitespace(char: string | undefined) {
  return /\s/.test(char ?? "");
}

function isWordChar(char: string | undefined) {
  return /\w/.test(char ?? "");
}
