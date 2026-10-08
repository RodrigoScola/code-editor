import { describe, expect, it } from "vitest";
import { layoutAndPaint, screen, screenText } from "../../../helpers/ui.js";

// Proposed API: setTextOverflow("ellipsis"). Like "clip", but a line that
// does not fit ends with "…" in its last visible column.

function truncated(text: string, width: number, height = 1) {
  const { canvas, root } = screen(width, height);
  root.setContent(text).setTextOverflow("ellipsis");

  layoutAndPaint(root, canvas);

  return { canvas, root };
}

describe("text-overflow: ellipsis", () => {
  it("ends a line that is too long with …", () => {
    const { canvas } = truncated("hello world", 8);

    expect(screenText(canvas)).eq("hello w…");
  });

  it("keeps the line exactly as wide as the space", () => {
    const { root } = truncated("hello world", 8);

    expect(root.content().lines()[0].width()).eq(8);
  });

  it("leaves a short line alone", () => {
    const { canvas } = truncated("hi", 8);

    expect(screenText(canvas)).eq("hi");
  });

  it("leaves a line that fits exactly alone", () => {
    const { canvas } = truncated("12345678", 8);

    expect(screenText(canvas)).eq("12345678");
  });

  it("truncates each line on its own", () => {
    const { canvas } = truncated("hello world\nok", 8, 2);

    expect(screenText(canvas)).eq("hello w…\nok");
  });

  it("does not wrap", () => {
    const { root } = truncated("hello world", 8, 3);

    expect(root.content().lines()).length(1);
  });
});
