import { describe, expect, it } from "vitest";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { LayoutEngine } from "../../../../src/ui/layout/layout.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import {
  cell,
  layoutAndPaint,
  screen,
  stripAnsi,
} from "../../../helpers/ui.js";

// Terminal cells are not string indexes:
// - CJK characters and most emoji take 2 columns
// - emoji outside the BMP are 2 UTF-16 code units ("😀".length === 2)
// - combining marks ("e" + U+0301) take 0 columns and belong to the
//   character before them
//
// Text has to be measured, wrapped, clipped and painted by display width,
// one grapheme per cell. What a wide character leaves in its second cell is
// up to the implementation; these tests only check where the next character
// lands and what the terminal receives.

function paintLine(text: string, width: number) {
  const { canvas, root } = screen(width, 1);
  root.setContent(text);
  layoutAndPaint(root, canvas);
  return { canvas, root };
}

function frame(text: string, width: number) {
  const { canvas, root } = paintLine(text, width);
  const renderer = Renderer.Create(canvas).setOutput(() => {});
  renderer.build(root);
  return stripAnsi(renderer.render());
}

describe("painting wide characters", () => {
  it("a CJK character takes two cells", () => {
    const { canvas } = paintLine("你ab", 4);

    expect(cell(canvas, 0, 0).display()).eq("你");
    expect(cell(canvas, 2, 0).display()).eq("a");
    expect(cell(canvas, 3, 0).display()).eq("b");
  });

  it("an emoji is kept whole and takes two cells", () => {
    const { canvas } = paintLine("😀a", 3);

    expect(cell(canvas, 0, 0).display()).eq("😀");
    expect(cell(canvas, 2, 0).display()).eq("a");
  });

  it("a combining mark stays in the same cell as its base", () => {
    const { canvas } = paintLine("éa", 3);

    expect(cell(canvas, 0, 0).display()).eq("é");
    expect(cell(canvas, 1, 0).display()).eq("a");
  });

  it("the rendered row is exactly as wide as the screen", () => {
    // 你 (2) + a + b = 4 columns, nothing more
    expect(frame("你ab", 4)).eq("你ab");
  });

  it("renders emoji without throwing", () => {
    expect(() => frame("😀a", 3)).not.toThrow();
    expect(frame("😀a", 3)).eq("😀a");
  });
});

describe("measuring by display width", () => {
  it("TextLayout width counts columns", () => {
    const { root } = paintLine("你好", 10);

    expect(root.content().width()).eq(4);
  });

  it("the component measures its text in columns", () => {
    const label = new DisplayComponent().setContent("你好");

    const size = label.measure(LayoutEngine.Unconstrained());

    expect(size.width).eq(4);
  });
});

describe("wrapping and clipping by display width", () => {
  it("wraps after the columns run out, not the characters", () => {
    const { canvas, root } = screen(4, 2);
    root.setContent("你好世界");

    layoutAndPaint(root, canvas);

    expect(root.content().lines().map((line) => line.content())).toEqual([
      "你好",
      "世界",
    ]);
  });

  it("moves a wide character to the next line instead of splitting it", () => {
    const { canvas, root } = screen(2, 3);
    root.setContent("a你b");

    layoutAndPaint(root, canvas);

    expect(root.content().lines().map((line) => line.content())).toEqual([
      "a",
      "你",
      "b",
    ]);
  });

  it("clips a wide character that does not fit completely", () => {
    const { canvas, root } = screen(3, 1);
    root.setContent("你好").setTextOverflow("clip");

    const renderer = Renderer.Create(canvas).setOutput(() => {});
    layoutAndPaint(root, canvas);
    renderer.build(root);

    // 你 takes 2 of the 3 columns, half of 好 cannot be drawn
    expect(stripAnsi(renderer.render())).eq("你 ");
  });
});
