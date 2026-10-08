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
  const save = "workbench.action.files.save";

  it("an auto save keeps the white space right before the cursor", () => {
    const vs = code("a  \nb  |", { path: "a.txt" }).setting("files.trimTrailingWhitespace", true);

    vs.ctx.commands.execute(save, vs.ctx, { reason: "autoSave" });

    expect(vs.window().document.read()).eq("a\nb  ");
  });

  it("trimFinalNewlines on a file that is only newlines leaves it empty", () => {
    const vs = code("\n\n\n", { path: "a.txt" }).setting("files.trimFinalNewlines", true).run(save);

    expect(vs.window().document.read()).eq("");
  });

  it("insertFinalNewline does not add one to an empty file", () => {
    const vs = code("", { path: "a.txt" }).setting("files.insertFinalNewline", true).run(save);

    expect(vs.window().document.read()).eq("");
  });

  it("an explicit save runs the save actions even when nothing changed", () => {
    const vs = code("a  ", { path: "a.txt" }).setting("files.trimTrailingWhitespace", true);
    vs.window().document.dirty = false;

    vs.run(save);

    expect(vs.window().document.read()).eq("a");
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
