// LSP's basic shapes. Lines and characters are 0-based, characters in
// UTF-16 code units (what JS string indexes already are).

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  path: string;
  range: Range;
}

export interface TextEdit {
  range: Range;
  newText: string;
}
