import { describe, expect, it } from "vitest";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// Justify, like CSS text-align: justify:
// - every wrapped line except the last line of a paragraph is stretched to
//   exactly the available width
// - extra spaces go to the gaps from left to right
// - the last line of a paragraph (each buffer line is a paragraph) is left
//   as it is
// - a line with no spaces cannot be stretched and is left as it is
//
// Uses word wrap (setWrapMode("word"), see word-wrap.test.ts): with
// character wrap every wrapped line is already full.
//
// Note: "justifies on the center" in layout.test.ts expects "e ftg" (the last
// line of its paragraph) to be stretched to 8, which contradicts these rules.
// Update it when this lands.

function justified(text: string, width: number) {
  const { canvas, root } = screen(width, 5);
  root.setContent(text).setTextJustify(true);
  root.content().setWrapMode("word");

  layoutAndPaint(root, canvas);

  return root.content().lines();
}

describe("justify", () => {
  it("stretches a wrapped line to the full width", () => {
    const lines = justified("aa bb cc dd ee", 10);

    expect(lines[0].content()).eq("aa  bb  cc");
  });

  it("gives the extra spaces to the leftmost gaps first", () => {
    // "aa bb cc" is 8 wide, 3 spaces to add over 2 gaps
    const lines = justified("aa bb cc ddddd", 11);

    expect(lines[0].content()).eq("aa   bb  cc");
  });

  it("justifies the first line of a paragraph too", () => {
    const lines = justified("aa bb cc dd ee", 10);

    expect(lines[0].width()).eq(10);
  });

  it("leaves the last line of a paragraph alone", () => {
    const lines = justified("aa bb cc dd ee", 10);

    expect(lines[1].content()).eq("dd ee");
  });

  it("treats every buffer line as its own paragraph", () => {
    const lines = justified("aa bb cc dd ee\nff gg", 10);

    expect(lines.map((line) => line.content())).toEqual([
      "aa  bb  cc",
      "dd ee",
      "ff gg",
    ]);
  });

  it("leaves a line without spaces alone", () => {
    const lines = justified("abcdefgh ijklmnop", 10);

    expect(lines[0].content()).eq("abcdefgh");
  });

  it("a stretched line starts at x 0 whatever the alignment", () => {
    const { canvas, root } = screen(10, 5);
    root.setContent("aa bb cc dd ee").setTextJustify(true).setTextAlign("center");
    root.content().setWrapMode("word");

    layoutAndPaint(root, canvas);

    expect(root.content().lines()[0].x()).eq(0);
  });
});
