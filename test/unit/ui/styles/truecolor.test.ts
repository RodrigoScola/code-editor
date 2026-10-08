import { describe, expect, it } from "vitest";
import colors from "../../../../src/ui/colors.js";
import { DisplayComponent } from "../../../../src/ui/components/displayComponent.js";
import { Renderer } from "../../../../src/ui/renderer.js";
import { layoutAndPaint, screen } from "../../../helpers/ui.js";

// Colors can be given as hex ("#rrggbb" or "#rgb", any case) and come out as
// 24-bit SGR sequences:
//   foreground  ESC[38;2;r;g;bm
//   background  ESC[48;2;r;g;bm
// The ANSI constants in colors.ts keep working as they do today.

function render(style: (component: DisplayComponent) => void) {
  const { canvas, root } = screen(2, 1);
  root.setContent("x");
  style(root);

  layoutAndPaint(root, canvas);

  return Renderer.Create(canvas)
    .setOutput(() => {})
    .build(root)
    .render();
}

describe("hex colors", () => {
  it("background #rrggbb", () => {
    const frame = render((c) => c.setBackgroundColor("#ff0000"));

    expect(frame).toContain("\x1b[48;2;255;0;0m");
    expect(frame).not.toContain("#ff0000");
  });

  it("foreground #rrggbb", () => {
    const frame = render((c) => c.setColor("#00ff00"));

    expect(frame).toContain("\x1b[38;2;0;255;0m");
  });

  it("short #rgb", () => {
    const frame = render((c) => c.setBackgroundColor("#f80"));

    expect(frame).toContain("\x1b[48;2;255;136;0m");
  });

  it("uppercase", () => {
    const frame = render((c) => c.setColor("#0A0B0C"));

    expect(frame).toContain("\x1b[38;2;10;11;12m");
  });

  it("are inherited like any other color", () => {
    const { canvas, root } = screen(2, 1);
    root.setBackgroundColor("#123456");
    root.addChildren(new DisplayComponent().setContent("x"));

    layoutAndPaint(root, canvas);

    const frame = Renderer.Create(canvas)
      .setOutput(() => {})
      .build(root)
      .render();

    expect(frame).toContain("\x1b[48;2;18;52;86m");
  });
});

describe("ANSI constants", () => {
  it("still render as before", () => {
    const frame = render((c) =>
      c.setBackgroundColor(colors.BLUE_BACKGROUND).setColor(colors.RED_FOREGROUND),
    );

    expect(frame).toContain(colors.BLUE_BACKGROUND);
    expect(frame).toContain(colors.RED_FOREGROUND);
  });
});
