import { describe, expect, it, vi } from "vitest";
import { TextBuffer } from "../../../../src/ui/buffer/Buffer.js";

// Editing ranges of a TextBuffer. Deleting a selection, typing over it,
// pasting several lines, undo and language-server edits all come down to
// these. Proposed additions to src/ui/buffer/Buffer.ts (Point is
// { x: column, y: line }, like EditorSelection uses):
//
//   buffer.textInRange(start, end) -> string, lines joined with "\n"
//   buffer.removeRange(start, end) -> the point where the text was
//     (the earlier of the two), where the cursor goes afterwards
//   buffer.insertText(at, text) -> the point right after the inserted text
//     text can hold "\n" (and "\r\n", which becomes "\n")
//   buffer.replaceRange(start, end, text) -> the point after the new text
//
// Rules:
//   - start and end can come in either order
//   - columns past the end of a line count as the end of that line;
//     lines past the end of the buffer count as the last line
//   - a range across lines joins what is left of the first and last line
//   - the buffer always has at least one line (an empty document is [""])
//   - each edit tells onChange listeners once, and an edit that changes
//     nothing doesn't tell them at all

const p = (x: number, y: number) => ({ x, y });

const lines = (buffer: TextBuffer) => buffer.content().split("\n");

describe("the empty buffer", () => {
  it("has one empty line", () => {
    expect(new TextBuffer("").count()).eq(1);
    expect(new TextBuffer().count()).eq(1);
    expect(new TextBuffer().at(0)).eq("");
  });

  it("keeps one line after everything is removed", () => {
    const buffer = new TextBuffer("abc\ndef");

    buffer.removeRange(p(0, 0), p(3, 1));

    expect(buffer.count()).eq(1);
    expect(buffer.at(0)).eq("");
  });
});

describe("textInRange", () => {
  const buffer = () => new TextBuffer("hello world\nsecond line\nthird");

  it("inside one line", () => {
    expect(buffer().textInRange(p(6, 0), p(11, 0))).eq("world");
  });

  it("across lines", () => {
    expect(buffer().textInRange(p(6, 0), p(6, 1))).eq("world\nsecond");
  });

  it("whole lines include the line break between them", () => {
    expect(buffer().textInRange(p(0, 0), p(0, 2))).eq("hello world\nsecond line\n");
  });

  it("the same point is empty", () => {
    expect(buffer().textInRange(p(3, 1), p(3, 1))).eq("");
  });

  it("takes the points in either order", () => {
    expect(buffer().textInRange(p(11, 0), p(6, 0))).eq("world");
  });

  it("clamps points past the end", () => {
    expect(buffer().textInRange(p(3, 2), p(99, 99))).eq("rd");
  });
});

describe("removeRange", () => {
  it("removes part of a line", () => {
    const buffer = new TextBuffer("hello world");

    buffer.removeRange(p(5, 0), p(11, 0));

    expect(lines(buffer)).toEqual(["hello"]);
  });

  it("joins the lines a range spans", () => {
    const buffer = new TextBuffer("abc\ndef\nghi");

    buffer.removeRange(p(1, 0), p(2, 2));

    expect(lines(buffer)).toEqual(["ai"]);
  });

  it("removing a line break joins two lines", () => {
    const buffer = new TextBuffer("abc\ndef");

    buffer.removeRange(p(3, 0), p(0, 1));

    expect(lines(buffer)).toEqual(["abcdef"]);
  });

  it("removes whole lines", () => {
    const buffer = new TextBuffer("a\nb\nc\nd");

    buffer.removeRange(p(0, 1), p(0, 3));

    expect(lines(buffer)).toEqual(["a", "d"]);
  });

  it("takes the points in either order", () => {
    const buffer = new TextBuffer("abc\ndef");

    buffer.removeRange(p(2, 1), p(1, 0));

    expect(lines(buffer)).toEqual(["af"]);
  });

  it("returns where the text was, for the cursor", () => {
    const buffer = new TextBuffer("abc\ndef");

    expect(buffer.removeRange(p(2, 1), p(1, 0))).toEqual(p(1, 0));
  });

  it("an empty range changes nothing", () => {
    const buffer = new TextBuffer("xabc");
    // a real removal first, so this can't pass while removeRange does nothing
    buffer.removeRange(p(0, 0), p(1, 0));
    expect(lines(buffer)).toEqual(["abc"]);
    const listener = vi.fn();
    buffer.onChange(listener);

    buffer.removeRange(p(1, 0), p(1, 0));

    expect(lines(buffer)).toEqual(["abc"]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("clamps a column past the end of the line", () => {
    const buffer = new TextBuffer("abc\ndef");

    buffer.removeRange(p(1, 0), p(50, 0));

    expect(lines(buffer)).toEqual(["a", "def"]);
  });

  it("clamps a line past the end of the buffer", () => {
    const buffer = new TextBuffer("abc\ndef");

    buffer.removeRange(p(1, 0), p(0, 50));

    expect(lines(buffer)).toEqual(["a"]);
  });

  it("tells listeners once", () => {
    const buffer = new TextBuffer("abc\ndef\nghi");
    const listener = vi.fn();
    buffer.onChange(listener);

    buffer.removeRange(p(1, 0), p(1, 2));

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("insertText", () => {
  it("inserts inside a line", () => {
    const buffer = new TextBuffer("held");

    buffer.insertText(p(3, 0), "lo wor");

    expect(lines(buffer)).toEqual(["hello world"]);
  });

  it("returns the point after the text", () => {
    expect(new TextBuffer("ab").insertText(p(1, 0), "XY")).toEqual(p(3, 0));
  });

  it("a line break splits the line", () => {
    const buffer = new TextBuffer("abcd");

    const end = buffer.insertText(p(2, 0), "\n");

    expect(lines(buffer)).toEqual(["ab", "cd"]);
    expect(end).toEqual(p(0, 1));
  });

  it("inserts several lines", () => {
    const buffer = new TextBuffer("ab");

    const end = buffer.insertText(p(1, 0), "1\n22\n333");

    expect(lines(buffer)).toEqual(["a1", "22", "333b"]);
    expect(end).toEqual(p(3, 2));
  });

  it("turns \\r\\n into separate lines", () => {
    const buffer = new TextBuffer("");

    buffer.insertText(p(0, 0), "a\r\nb");

    expect(lines(buffer)).toEqual(["a", "b"]);
  });

  it("inserts at the end of the line and of the buffer", () => {
    const buffer = new TextBuffer("ab\ncd");

    buffer.insertText(p(2, 1), "!");
    buffer.insertText(p(2, 0), "?");

    expect(lines(buffer)).toEqual(["ab?", "cd!"]);
  });

  it("clamps a point past the end", () => {
    const buffer = new TextBuffer("ab");

    buffer.insertText(p(10, 10), "!");

    expect(lines(buffer)).toEqual(["ab!"]);
  });

  it("inserting nothing changes nothing", () => {
    const buffer = new TextBuffer("ab");
    const listener = vi.fn();
    buffer.onChange(listener);

    buffer.insertText(p(1, 0), "");

    expect(listener).not.toHaveBeenCalled();
  });

  it("tells listeners once, however many lines", () => {
    const buffer = new TextBuffer("ab");
    const listener = vi.fn();
    buffer.onChange(listener);

    buffer.insertText(p(1, 0), "1\n2\n3\n4");

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("replaceRange", () => {
  it("replaces part of a line", () => {
    const buffer = new TextBuffer("hello world");

    buffer.replaceRange(p(6, 0), p(11, 0), "there");

    expect(lines(buffer)).toEqual(["hello there"]);
  });

  it("replaces several lines with one", () => {
    const buffer = new TextBuffer("abc\ndef\nghi");

    const end = buffer.replaceRange(p(1, 0), p(2, 2), "X");

    expect(lines(buffer)).toEqual(["aXi"]);
    expect(end).toEqual(p(2, 0));
  });

  it("replaces one line with several", () => {
    const buffer = new TextBuffer("abc");

    const end = buffer.replaceRange(p(1, 0), p(2, 0), "1\n2");

    expect(lines(buffer)).toEqual(["a1", "2c"]);
    expect(end).toEqual(p(1, 1));
  });

  it("with an empty range it is an insert", () => {
    const buffer = new TextBuffer("ac");

    buffer.replaceRange(p(1, 0), p(1, 0), "b");

    expect(lines(buffer)).toEqual(["abc"]);
  });

  it("with empty text it is a remove", () => {
    const buffer = new TextBuffer("abc");

    buffer.replaceRange(p(1, 0), p(2, 0), "");

    expect(lines(buffer)).toEqual(["ac"]);
  });

  it("tells listeners once", () => {
    const buffer = new TextBuffer("abc\ndef");
    const listener = vi.fn();
    buffer.onChange(listener);

    buffer.replaceRange(p(1, 0), p(1, 1), "X\nY");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("round trips: replacing a range with its own text changes nothing", () => {
    const buffer = new TextBuffer("abc\ndef\nghi");
    const text = buffer.textInRange(p(1, 0), p(2, 1));

    buffer.replaceRange(p(1, 0), p(2, 1), text);

    expect(lines(buffer)).toEqual(["abc", "def", "ghi"]);
  });
});
