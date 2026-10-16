// files.encoding, files.eol, the status bar's encoding and EOL pickers

export type FileEncoding = "utf8" | "utf8bom" | "utf16le" | "utf16be";

export type Eol = "\n" | "\r\n";

export interface DecodedFile {
  // without the BOM
  text: string;
  // from the BOM; none means UTF-8
  encoding: FileEncoding;
  eol: Eol;
  // a NUL byte in a file without a UTF-16 BOM
  binary: boolean;
}

export function decodeFile(bytes: Uint8Array): DecodedFile {
  throw new Error("not implemented");
}

// with the BOM the encoding needs
export function encodeFile(text: string, encoding: FileEncoding): Uint8Array {
  throw new Error("not implemented");
}

// whichever is used more; fallback when there are no line breaks
export function detectEol(text: string, fallback: Eol): Eol {
  throw new Error("not implemented");
}
