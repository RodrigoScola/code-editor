// editor.detectIndentation: from how indentation changes line to line,
// tabs or spaces (whichever is used more) and a tab size of 2, 4, 6 or 8;
// the defaults when there is nothing to go on
export function guessIndentation(
  lines: string[],
  defaultTabSize: number,
  defaultInsertSpaces: boolean,
): { tabSize: number; insertSpaces: boolean } {
  throw new Error("not implemented");
}
