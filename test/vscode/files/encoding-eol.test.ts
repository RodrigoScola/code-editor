import { describe, expect, it } from "vitest";
import { decodeFile, detectEol, encodeFile } from "../../../src/Files/encoding.js";

// Proposed module src/Files/encoding.ts (files.encoding, files.eol, the
// status bar's encoding and EOL pickers).
//
//   decodeFile(bytes) -> { text, encoding, eol, binary }
//     encoding: "utf8" | "utf8bom" | "utf16le" | "utf16be", from the BOM
//     (no BOM means UTF-8). A NUL byte in a file without a UTF-16 BOM
//     means binary. The BOM is not part of the text.
//   encodeFile(text, encoding) -> bytes (with the BOM the encoding needs)
//   detectEol(text, fallback) -> "\n" | "\r\n": whichever is used more,
//     CRLF counts as CRLF only; the fallback when there are no line breaks.

const bytes = (...values: number[]) => new Uint8Array(values);
const utf8 = (text: string) => new TextEncoder().encode(text);

describe("decodeFile", () => {
  it("reads UTF-8 without a BOM", () => {
    expect(decodeFile(utf8("héllo"))).toMatchObject({ text: "héllo", encoding: "utf8" });
  });

  it("reads UTF-8 with a BOM and drops the BOM", () => {
    expect(decodeFile(bytes(0xef, 0xbb, 0xbf, 0x61))).toMatchObject({
      text: "a",
      encoding: "utf8bom",
    });
  });

  it("reads UTF-16 LE", () => {
    expect(decodeFile(bytes(0xff, 0xfe, 0x61, 0x00, 0x62, 0x00))).toMatchObject({
      text: "ab",
      encoding: "utf16le",
    });
  });

  it("reads UTF-16 BE", () => {
    expect(decodeFile(bytes(0xfe, 0xff, 0x00, 0x61))).toMatchObject({
      text: "a",
      encoding: "utf16be",
    });
  });

  it("calls a file with NUL bytes binary", () => {
    expect(decodeFile(bytes(0x61, 0x00, 0x62)).binary).eq(true);
  });

  it("is not binary for normal text", () => {
    expect(decodeFile(utf8("plain")).binary).eq(false);
  });

  it("reports the line endings", () => {
    expect(decodeFile(utf8("a\r\nb\r\n")).eol).eq("\r\n");
  });
});

describe("encodeFile", () => {
  it("writes UTF-8 without a BOM", () => {
    expect([...encodeFile("a", "utf8")]).toEqual([0x61]);
  });

  it("writes the BOM for utf8bom", () => {
    expect([...encodeFile("a", "utf8bom")]).toEqual([0xef, 0xbb, 0xbf, 0x61]);
  });

  it("round-trips UTF-16 LE", () => {
    const text = "héllo 😀";

    expect(decodeFile(encodeFile(text, "utf16le"))).toMatchObject({ text, encoding: "utf16le" });
  });

  it("round-trips UTF-16 BE", () => {
    const text = "abc";

    expect(decodeFile(encodeFile(text, "utf16be"))).toMatchObject({ text, encoding: "utf16be" });
  });
});

describe("detectEol", () => {
  it("uses CRLF when most line breaks are CRLF", () => {
    expect(detectEol("a\r\nb\r\nc\n", "\n")).eq("\r\n");
  });

  it("uses LF when most line breaks are LF", () => {
    expect(detectEol("a\nb\r\nc\n", "\r\n")).eq("\n");
  });

  it("uses the fallback when there are no line breaks", () => {
    expect(detectEol("abc", "\r\n")).eq("\r\n");
  });
});
