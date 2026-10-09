import { describe, expect, it } from "vitest";
import { decodeFile, detectEol, encodeFile } from "../../../src/Files/encoding.js";
import { coalesceEvents } from "../../../src/Files/watcher.js";
import { code } from "../harness.js";

// Edge cases for encodings, save actions and file events (base specs:
// encoding-eol, save-participants, watcher).

const bytes = (...values: number[]) => new Uint8Array(values);

describe("encodings", () => {
  it("an empty file is UTF-8 and not binary", () => {
    expect(decodeFile(bytes())).toMatchObject({ text: "", encoding: "utf8", binary: false });
  });

  it("a UTF-16 file with a BOM is not called binary even though it has NUL bytes", () => {
    expect(decodeFile(bytes(0xff, 0xfe, 0x61, 0x00)).binary).eq(false);
  });

  it("invalid UTF-8 bytes become replacement characters instead of throwing", () => {
    expect(decodeFile(bytes(0x61, 0xff, 0x62)).text).eq("a�b");
  });

  it("a lone CR does not outweigh more LFs", () => {
    expect(detectEol("a\rb\nc\n", "\r\n")).eq("\n");
  });

  it("an emoji survives a UTF-8 round trip", () => {
    expect(decodeFile(encodeFile("😀", "utf8")).text).eq("😀");
  });
});

describe("save actions", () => {
  const save = "textEditor.saveFile";

  it("an auto save keeps the white space right before the cursor", () => {
    const ide = code("a  \nb  |", { path: "a.txt" }).setting("trim_trailing_whitespace", true);

    ide.executeCommand(save, { reason: "autoSave" });

    expect(ide.window().document.read()).eq("a\nb  ");
  });

  it("trimFinalNewlines on a file that is only newlines leaves it empty", () => {
    const ide = code("\n\n\n", { path: "a.txt" }).setting("trim_final_newlines", true).executeCommand(save);

    expect(ide.window().document.read()).eq("");
  });

  it("insertFinalNewline does not add one to an empty file", () => {
    const ide = code("", { path: "a.txt" }).setting("insert_final_newline", true).executeCommand(save);

    expect(ide.window().document.read()).eq("");
  });

  it("an explicit save runs the save actions even when nothing changed", () => {
    const ide = code("a  ", { path: "a.txt" }).setting("trim_trailing_whitespace", true);
    ide.window().document.dirty = false;

    ide.executeCommand(save);

    expect(ide.window().document.read()).eq("a");
  });
});

describe("file events", () => {
  const e = (type: "added" | "changed" | "deleted", path: string) => ({ type, path });

  it("added, deleted, added is added", () => {
    expect(coalesceEvents([e("added", "/a"), e("deleted", "/a"), e("added", "/a")])).toEqual([e("added", "/a")]);
  });

  it("changed then deleted is deleted", () => {
    expect(coalesceEvents([e("changed", "/a"), e("deleted", "/a")])).toEqual([e("deleted", "/a")]);
  });

  it("a deleted folder does not swallow a sibling with a similar name", () => {
    expect(coalesceEvents([e("deleted", "/dir"), e("changed", "/dir2/a")])).toEqual([
      e("deleted", "/dir"),
      e("changed", "/dir2/a"),
    ]);
  });
});
