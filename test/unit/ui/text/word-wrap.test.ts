import { describe, expect, it } from "vitest";
import { layoutAndPaint, screen, screenText } from "../../../helpers/ui.js";

// Proposed API: component.content().setWrapMode("character" | "word")
// "character" stays the default (what the existing tests expect).
//
// In "word" mode lines break at spaces; the space at a break is dropped. A
// word longer than the line breaks by character.

function wrapped(text: string, width: number, height = 5) {
  const { canvas, root } = screen(width, height);
  root.setContent(text);
  root.content().setWrapMode("word");

  layoutAndPaint(root, canvas);

  return {
    canvas,
    lines: root.content().lines(),
    contents: root.content().lines().map((line) => line.content()),
  };
}

describe("word wrap", () => {
  it("keeps a line that fits", () => {
    expect(wrapped("hello world", 11).contents).toEqual(["hello world"]);
  });

  it("breaks between words", () => {
    expect(wrapped("hello world foo", 11).contents).toEqual([
      "hello world",
      "foo",
    ]);
  });

  it("puts as many words on a line as fit", () => {
    expect(wrapped("aa bb cc dd ee", 8).contents).toEqual(["aa bb cc", "dd ee"]);
  });

  it("drops the space at the break", () => {
    expect(wrapped("hello world", 8).contents).toEqual(["hello", "world"]);
  });

  it("breaks a word that is longer than the line by character", () => {
    expect(wrapped("abcdefghij", 4).contents).toEqual(["abcd", "efgh", "ij"]);
  });

  it("keeps buffer positions so the cursor can map back", () => {
    const { lines } = wrapped("hello world", 8);

    expect(lines[1].start()).eq(6);
    expect(lines[1].end()).eq(11);
  });

  it("paints the wrapped lines", () => {
    const { canvas } = wrapped("hello world foo", 11, 3);

    expect(screenText(canvas)).eq("hello world\nfoo\n");
  });

  it("character mode is still the default", () => {
    const { canvas, root } = screen(8, 2);
    root.setContent("hello world");

    layoutAndPaint(root, canvas);

    expect(root.content().lines().map((line) => line.content())).toEqual([
      "hello wo",
      "rld",
    ]);
  });
});
