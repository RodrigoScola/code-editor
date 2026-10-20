import { Cursor } from "../../../Editor/Cursor.js";

export class CursorMovement {
  private readonly cursor: Cursor;
  constructor(cursor: Cursor) {
    this.cursor = cursor;
  }

  // goes to line/column and makes that column the one up/down try to keep
  moveTo(line: number, column: number) {
    this.place(line, column);
    this.cursor.prefferedColumn = this.cursor.column;
  }

  // ─── Vim insert mode: between characters, nothing wraps ───

  insertLeft() {
    const { line, column } = this.cursor;
    if (column > 0) this.moveTo(line, column - 1);
  }

  // can go one past the last character
  insertRight() {
    const { line, column } = this.cursor;
    if (column < this.lineLength(line)) this.moveTo(line, column + 1);
  }

  insertUp() {
    const line = this.lineAbove();
    this.placeKeepingColumn(line, this.lineLength(line));
  }

  insertDown() {
    const line = this.lineBelow();
    this.placeKeepingColumn(line, this.lineLength(line));
  }

  left() {
    const { line, column } = this.cursor;
    if (column === 0 && line > 0) {
      this.moveTo(line - 1, this.lineLength(line - 1));
    } else {
      this.insertLeft();
    }
  }

  // on the last character of a line (or past it), goes to the start of the
  // line below instead of onto the empty cell after the line
  right() {
    const { line, column } = this.cursor;
    if (column >= this.lastChar(line)) {
      if (line < this.lastLine()) this.moveTo(line + 1, 0);
      return;
    }
    this.moveTo(line, column + 1);
  }

  // on the first line, goes to its start
  up() {
    if (this.cursor.line === 0) {
      this.lineStart();
    } else {
      this.insertUp();
    }
  }

  // on the last line, goes to its end
  down() {
    if (this.cursor.line === this.lastLine()) {
      this.lineEnd();
    } else {
      this.insertDown();
    }
  }

  // Home: the start of the line; pressed again there, the start of the file
  home() {
    if (this.cursor.column > 0) {
      this.lineStart();
    } else {
      this.documentStart();
    }
  }

  // End: the end of the line; pressed again there, the end of the file
  end() {
    if (this.cursor.column < this.lineLength(this.cursor.line)) {
      this.lineEnd();
    } else {
      this.documentEnd();
    }
  }

  // ─── Vim normal mode: on a character ───

  // h
  vimLeft() {
    this.insertLeft();
  }

  // l: stops on the last character
  vimRight() {
    const { line, column } = this.cursor;
    if (column < this.lastChar(line)) this.moveTo(line, column + 1);
  }

  // k
  vimUp() {
    const line = this.lineAbove();
    this.placeKeepingColumn(line, this.lastChar(line));
  }

  // j
  vimDown() {
    const line = this.lineBelow();
    this.placeKeepingColumn(line, this.lastChar(line));
  }

  // $: the last character; j and k stay at the end of each line after it
  vimLineEnd() {
    this.moveTo(this.cursor.line, this.lastChar(this.cursor.line));
    this.cursor.prefferedColumn = Infinity;
  }

  // ─── lines and the whole file ───

  lineStart() {
    this.moveTo(this.cursor.line, 0);
  }

  // one past the last character
  lineEnd() {
    this.moveTo(this.cursor.line, this.lineLength(this.cursor.line));
  }

  documentStart() {
    this.moveTo(0, 0);
  }

  documentEnd() {
    const last = this.lastLine();
    this.moveTo(last, this.lineLength(last));
  }

  // ─── words (Vim's w, W and b) ───

  // w: the start of the next word; punctuation runs are words of their own
  nextWord() {
    const { line } = this.cursor;
    const text = this.lineText(line);
    let column = this.cursor.column;

    if (column >= text.length) {
      if (line < this.lastLine()) {
        this.moveTo(line + 1, 0);
      } else {
        this.moveTo(line, this.lastChar(line));
      }
      return;
    }

    const first = text[column];
    if (isWhitespace(first)) {
      column = skip(text, column, isWhitespace);
    } else if (isWordChar(first)) {
      column = skip(text, column, isWordChar);
      column = skip(text, column, isWhitespace);
    } else {
      column = skip(text, column, isPunctuation);
      column = skip(text, column, isWhitespace);
    }

    if (column >= text.length && line < this.lastLine()) {
      this.moveTo(line + 1, 0);
      return;
    }

    this.moveTo(line, Math.min(column, this.lastChar(line)));
  }

  // W: the start of the next WORD (words are split only by white space)
  nextCompleteWordStart() {
    const { line } = this.cursor;
    const text = this.lineText(line);
    let column = this.cursor.column;

    if (column >= text.length) {
      this.moveTo(line, this.lastChar(line));
      return;
    }

    if (isWhitespace(text[column])) {
      column = skip(text, column, isWhitespace);
    } else {
      column = skip(text, column, (char) => !isWhitespace(char));
      column = skip(text, column, isWhitespace);
    }

    this.moveTo(line, Math.min(column, this.lastChar(line)));
  }

  // b: back to the start of the word before the cursor
  previousWordStart() {
    const { line } = this.cursor;
    const text = this.lineText(line);
    let column = this.cursor.column;

    // At the beginning of the line: go to the previous line.
    if (column === 0) {
      if (line > 0) {
        this.moveTo(line - 1, this.lastChar(line - 1));
      }
      return;
    }

    // Move left at least once.
    column--;

    // Skip whitespace.
    while (column > 0 && isWhitespace(text[column])) {
      column--;
    }

    // If we're inside a word, move to its beginning.
    if (isWordChar(text[column])) {
      while (column > 0 && isWordChar(text[column - 1])) {
        column--;
      }
    } else {
      // We're on punctuation.
      // Move across punctuation until we reach whitespace,
      // then find the beginning of the previous word.
      while (column > 0 && !isWhitespace(text[column - 1])) {
        column--;
      }

      while (column > 0 && isWhitespace(text[column - 1])) {
        column--;
      }

      if (isWordChar(text[column])) {
        while (column > 0 && isWordChar(text[column - 1])) {
          column--;
        }
      }
    }

    this.moveTo(line, column);
  }

  // ─── helpers ───

  // puts the cursor at line/column, clamped to the buffer, without touching
  // the column up/down try to keep
  private place(line: number, column: number) {
    const cursor = this.cursor;
    if (!cursor.buffer()) {
      return;
    }

    cursor.line = clamp(line, 0, this.lastLine());
    cursor.column = clamp(column, 0, this.lineLength(cursor.line));

    if (cursor.selection) cursor.updateSelection();
  }

  // up/down: back to the column the cursor was last put on, as far as
  // `lastColumn` lets it on that line
  private placeKeepingColumn(line: number, lastColumn: number) {
    this.place(line, Math.min(this.cursor.prefferedColumn, lastColumn));
  }

  private lineAbove() {
    return Math.max(this.cursor.line - 1, 0);
  }

  private lineBelow() {
    return Math.min(this.cursor.line + 1, this.lastLine());
  }

  private lineText(line: number) {
    return this.cursor.buffer()?.at(line) ?? "";
  }

  private lineLength(line: number) {
    return Math.max(this.lineText(line).length, 0);
  }

  // the column of the last character (0 on an empty line)
  private lastChar(line: number) {
    return Math.max(this.lineLength(line) - 1, 0);
  }

  private lastLine() {
    return Math.max((this.cursor.buffer()?.count() ?? 0) - 1, 0);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

// the column after the run of characters starting at `from` that pass `test`
function skip(text: string, from: number, test: (char: string) => boolean) {
  let column = from;
  while (column < text.length && test(text[column])) {
    column++;
  }
  return column;
}

function isWhitespace(char: string | undefined) {
  return /\s/.test(char ?? "");
}

function isWordChar(char: string | undefined) {
  return /\w/.test(char ?? "");
}

function isPunctuation(char: string | undefined) {
  return !isWordChar(char) && !isWhitespace(char);
}
