import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { Configuration } from "../../../../src/config.js";
import type { ICanvas } from "../../../../src/ui/Canvas/TerminalCanvas.js";
import { WindowCanvas } from "../../../../src/ui/Canvas/WindowCanvas.js";
import { ComponentStyle } from "../../../../src/ui/styles/ComponentStyles.js";
import { LayoutBounds } from "../../../../src/ui/layout/LayoutBounds.js";
import { TextLayout } from "../../../../src/ui/text/text.js";
import { ViewPort } from "../../../../src/ui/display/viewport.js";
import { distance, Frame, rgb } from "../../../ide/window/helpers.js";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
} from "../../../../src/ui/colors/colors.js";

// WindowCanvas: the ICanvas the window renderer paints into, drawn with
// Canvas 2D (@napi-rs/canvas) straight onto the canvas it is given.
//
//   new WindowCanvas(createCanvas(width, height))
//
// - no cells: a point (x, y) is the pixel (x, y)
// - clear() is DEFAULT_BACKGROUND everywhere, opaque
// - fillRect / lineTo paint in the style's background color, like the
//   terminal canvas shows a filled cell by its background
// - colors may be CSS ("#rrggbb") or ANSI codes; the default colors
//   ("transparent", "initial") are DEFAULT_BACKGROUND / DEFAULT_FOREGROUND
// - drawText draws from the top-left of its bounds and never outside them;
//   "\n" starts the next line below, a viewport picks which lines show
// - hidden as in CSS (visibility: hidden): nothing of it is painted, not even
//   its background
// - inverse, bold, italic, dim, underline and strikethrough as the terminal
//   shows them
//
// How tall a line is and how wide a character is come from the font; none
// of these specs fix those numbers. Text is anti-aliased, so text specs look
// for "ink" (pixels far from the background) instead of exact pixels.

const BLUE = "#2472c8";
const WHITE = "#e5e5e5";
const RED = "#cd3131";

// a cleared canvas, and a way to read its pixels
function setup(width = 200, height = 60) {
  const pixels = createCanvas(width, height);
  const canvas = new WindowCanvas(pixels);
  canvas.clear();

  const frame = () => {
    const data = pixels.getContext("2d").getImageData(0, 0, width, height).data;
    return new Frame({
      width,
      height,
      stride: width * 4,
      format: "rgba32",
      buffer: Buffer.from(data),
    });
  };

  return { canvas, frame };
}

// x, y, width, height
function bounds(x: number, y: number, width: number, height: number) {
  return LayoutBounds.Create(width, height, x, y);
}

function style() {
  return ComponentStyle.Create();
}

// a TextLayout laid out with plenty of room, so no line wraps
function layout(text: string) {
  const t = new TextLayout();
  t.insertAt(0, text);
  t.measure(bounds(0, 0, 1000, 1000));
  return t;
}

function viewport(firstLine: number, visibleLines = Infinity) {
  const v = new ViewPort();
  v.firstLine = firstLine;
  v.visibleLines = visibleLines;
  return v;
}

// text drawn into a roomy box at (10, 10)
const BOX = () => bounds(10, 10, 180, 40);

// ---- reading the pixels ----

function isInk(color: string, background = DEFAULT_BACKGROUND) {
  return distance(color, background) > 40;
}

// the smallest rectangle holding every ink pixel, or null if there is none
function inkBox(frame: Frame, background = DEFAULT_BACKGROUND) {
  let left = Infinity;
  let top = Infinity;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (isInk(frame.pixel(x, y), background)) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

function inkCount(frame: Frame, background = DEFAULT_BACKGROUND) {
  return frame
    .pixels(0, 0, frame.width, frame.height)
    .filter((p) => isInk(p, background)).length;
}

// rows with ink, grouped into bands of touching rows (one band per line of
// text, if the lines don't overlap)
function inkBands(frame: Frame) {
  const bands: { top: number; bottom: number }[] = [];
  for (let y = 0; y < frame.height; y++) {
    const row = frame.pixels(0, y, frame.width, 1);
    if (!row.some((p) => isInk(p))) {
      continue;
    }
    const last = bands.at(-1);
    if (last && last.bottom === y - 1) {
      last.bottom = y;
    } else {
      bands.push({ top: y, bottom: y });
    }
  }
  return bands;
}

// the rows where ink runs unbroken from left to right (both included)
function unbrokenRows(frame: Frame, left: number, right: number) {
  const rows: number[] = [];
  for (let y = 0; y < frame.height; y++) {
    if (frame.pixels(left, y, right - left + 1, 1).every((p) => isInk(p))) {
      rows.push(y);
    }
  }
  return rows;
}

// the brightest red, green or blue value of any pixel
function brightestChannel(frame: Frame) {
  return Math.max(
    ...frame.pixels(0, 0, frame.width, frame.height).flatMap((p) => rgb(p)),
  );
}

// the pixel furthest from the background, in the whole frame or in a box
function inkiest(
  frame: Frame,
  background = DEFAULT_BACKGROUND,
  box = { left: 0, top: 0, right: frame.width - 1, bottom: frame.height - 1 },
) {
  return frame
    .pixels(
      box.left,
      box.top,
      box.right - box.left + 1,
      box.bottom - box.top + 1,
    )
    .sort((a, b) => distance(b, background) - distance(a, background))[0];
}

function drawn(draw: (canvas: WindowCanvas) => void, width = 200, height = 60) {
  const { canvas, frame } = setup(width, height);
  draw(canvas);
  return frame();
}

// a point of the text where no letter reaches: the middle of its spaces,
// halfway down the letters (measured on the same text drawn plainly)
function gapIn(text: string) {
  const letters = inkBox(
    drawn((canvas) => canvas.drawText(BOX(), text, style().setColor(WHITE))),
  )!;
  return {
    x: Math.round((letters.left + letters.right) / 2),
    y: Math.round((letters.top + letters.bottom) / 2),
    letters,
  };
}

describe("clear()", () => {
  it("is DEFAULT_BACKGROUND everywhere", () => {
    const frame = drawn(() => {});

    expect(frame.colors(0, 0, frame.width, frame.height)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });

  it("every pixel is opaque", () => {
    const frame = drawn(() => {});

    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        expect(frame.rgba(x, y)[3]).eq(255);
      }
    }
  });

  it("wipes what was drawn", () => {
    const frame = drawn((canvas) => {
      canvas.fillRect(bounds(0, 0, 50, 20), style().setBackgroundColor(BLUE));
      canvas.drawText(BOX(), "hello", style().setColor(WHITE));
      canvas.clear();
    });

    expect(frame.colors(0, 0, frame.width, frame.height)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });
});

describe("fillRect()", () => {
  it("fills exactly its pixels", () => {
    // x 3..6, y 2..4
    const frame = drawn((canvas) =>
      canvas.fillRect(bounds(3, 2, 4, 3), style().setBackgroundColor(BLUE)),
    );

    expect(frame.colors(3, 2, 4, 3)).toEqual(new Set([BLUE]));
    // one pixel out on every side
    expect(frame.pixel(2, 2)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(7, 2)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(3, 1)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(3, 5)).eq(DEFAULT_BACKGROUND);
  });

  it("a 256-color ANSI code", () => {
    const frame = drawn((canvas) =>
      canvas.fillRect(
        bounds(0, 0, 4, 4),
        style().setBackgroundColor("\x1b[48;5;208m"),
      ),
    );

    expect(frame.pixel(1, 1)).eq("#ff8700");
  });

  it("a true-color ANSI code", () => {
    const frame = drawn((canvas) =>
      canvas.fillRect(
        bounds(0, 0, 4, 4),
        style().setBackgroundColor("\x1b[48;2;18;52;86m"),
      ),
    );

    expect(frame.pixel(1, 1)).eq("#123456");
  });

  it("inverse fills with the foreground color", () => {
    const frame = drawn((canvas) =>
      canvas.fillRect(
        bounds(0, 0, 4, 4),
        style().setBackgroundColor(BLUE).setColor(WHITE).setInverse(true),
      ),
    );

    expect(frame.colors(0, 0, 4, 4)).toEqual(new Set([WHITE]));
  });

  it("inverse with default colors fills DEFAULT_FOREGROUND", () => {
    const frame = drawn((canvas) =>
      canvas.fillRect(bounds(0, 0, 4, 4), style().setInverse(true)),
    );

    expect(frame.colors(0, 0, 4, 4)).toEqual(new Set([DEFAULT_FOREGROUND]));
  });

  // like CSS visibility: hidden, none of it is painted, so what is under it
  // shows through
  it("hidden paints nothing: what is under it stays", () => {
    const frame = drawn((canvas) => {
      canvas.fillRect(bounds(0, 0, 10, 10), style().setBackgroundColor(BLUE));
      canvas.fillRect(
        bounds(0, 0, 4, 4),
        style().setBackgroundColor(RED).setHidden(true),
      );
    });

    expect(frame.colors(0, 0, 10, 10)).toEqual(new Set([BLUE]));
  });

  // the terminal canvas resets the cells to the default, which shows the
  // terminal's own background; the window's is DEFAULT_BACKGROUND
  it("with no background color, it paints DEFAULT_BACKGROUND", () => {
    const frame = drawn((canvas) => {
      canvas.fillRect(bounds(0, 0, 10, 10), style().setBackgroundColor(BLUE));
      canvas.fillRect(bounds(0, 0, 4, 4), style());
    });

    expect(frame.colors(0, 0, 4, 4)).toEqual(new Set([DEFAULT_BACKGROUND]));
    expect(frame.pixel(6, 6)).eq(BLUE);
  });

  // ICanvas allows null, and the renderers pass it
  it("a null style is the default style", () => {
    const frame = drawn((canvas) => {
      const icanvas: ICanvas = canvas;
      icanvas.fillRect(bounds(0, 0, 10, 10), style().setBackgroundColor(BLUE));
      icanvas.fillRect(bounds(0, 0, 4, 4), null);
    });

    expect(frame.colors(0, 0, 4, 4)).toEqual(new Set([DEFAULT_BACKGROUND]));
  });

  it("a rectangle partly off the canvas paints the part on it", () => {
    const frame = drawn(
      (canvas) =>
        canvas.fillRect(bounds(-2, -2, 5, 5), style().setBackgroundColor(BLUE)),
      10,
      10,
    );

    expect(frame.colors(0, 0, 3, 3)).toEqual(new Set([BLUE]));
    expect(frame.pixel(3, 3)).eq(DEFAULT_BACKGROUND);
  });
});

describe("lineTo()", () => {
  it("a horizontal line is exactly its pixels, both ends included", () => {
    const frame = drawn((canvas) =>
      canvas.lineTo(
        { x: 2, y: 5 },
        { x: 8, y: 5 },
        style().setBackgroundColor(BLUE),
      ),
    );

    expect(frame.colors(2, 5, 7, 1)).toEqual(new Set([BLUE]));
    expect(frame.pixel(1, 5)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(9, 5)).eq(DEFAULT_BACKGROUND);
    expect(frame.colors(2, 4, 7, 1)).toEqual(new Set([DEFAULT_BACKGROUND]));
    expect(frame.colors(2, 6, 7, 1)).toEqual(new Set([DEFAULT_BACKGROUND]));
  });

  it("a vertical line is exactly its pixels, both ends included", () => {
    const frame = drawn((canvas) =>
      canvas.lineTo(
        { x: 4, y: 1 },
        { x: 4, y: 9 },
        style().setBackgroundColor(BLUE),
      ),
    );

    expect(frame.colors(4, 1, 1, 9)).toEqual(new Set([BLUE]));
    expect(frame.pixel(4, 0)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(4, 10)).eq(DEFAULT_BACKGROUND);
    expect(frame.colors(3, 1, 1, 9)).toEqual(new Set([DEFAULT_BACKGROUND]));
    expect(frame.colors(5, 1, 1, 9)).toEqual(new Set([DEFAULT_BACKGROUND]));
  });

  it("drawn backwards, it is the same line", () => {
    const blue = style().setBackgroundColor(BLUE);
    const forwards = drawn((canvas) =>
      canvas.lineTo({ x: 2, y: 5 }, { x: 8, y: 5 }, blue),
    );
    const backwards = drawn((canvas) =>
      canvas.lineTo({ x: 8, y: 5 }, { x: 2, y: 5 }, blue),
    );

    expect(forwards.pixel(5, 5)).eq(BLUE);
    expect(backwards.call.buffer.equals(forwards.call.buffer)).eq(true);
  });

  it("inverse draws in the foreground color", () => {
    const frame = drawn((canvas) =>
      canvas.lineTo(
        { x: 2, y: 5 },
        { x: 8, y: 5 },
        style().setBackgroundColor(BLUE).setColor(WHITE).setInverse(true),
      ),
    );

    expect(frame.colors(2, 5, 7, 1)).toEqual(new Set([WHITE]));
  });

  it("a diagonal line reaches both its ends", () => {
    const frame = drawn((canvas) =>
      canvas.lineTo(
        { x: 2, y: 2 },
        { x: 20, y: 12 },
        style().setBackgroundColor(WHITE),
      ),
    );

    expect(isInk(frame.pixel(2, 2))).eq(true);
    expect(isInk(frame.pixel(20, 12))).eq(true);
  });
});

describe("drawText(): where the text goes", () => {
  it("its ink starts at the top-left of its bounds, not before", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), "Hello", style().setColor(WHITE)),
    );

    const box = inkBox(frame);

    expect(box).not.toBeNull();
    expect(box!.left).toBeGreaterThanOrEqual(10);
    expect(box!.top).toBeGreaterThanOrEqual(10);
  });

  // a font leaves room above its capitals, so a capital that touches the
  // top of the bounds was drawn too high and cut off there
  it("capitals sit inside the line, not cut off at its top", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), "MH", style().setColor(WHITE)),
    );

    const box = inkBox(frame);

    frame.show();

    expect(box!.top).toBeGreaterThan(10);
  });

  it("nothing is drawn right of its bounds", () => {
    const st = style().setColor(WHITE).setBackgroundColor(WHITE).setFontSize(8);
    const frame = drawn((canvas) =>
      canvas.drawText(bounds(10, 10, 30, 40), "MMMMMMMMMMMM", st),
    );

    const box = inkBox(frame);

    expect(box!.right).toBeLessThan(40);
  });

  it("nothing is drawn below its bounds", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(bounds(10, 10, 180, 10), "MMMM", style().setColor(WHITE)),
    );

    const box = inkBox(frame);

    expect(box).not.toBeNull();
    expect(box!.bottom).toBeLessThan(20);
  });

  it("an empty string draws nothing", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), "", style().setBackgroundColor(BLUE)),
    );

    expect(inkCount(frame)).eq(0);
  });

  it("text running off the canvas doesn't throw", () => {
    expect(() =>
      drawn((canvas) =>
        canvas.drawText(
          bounds(190, 50, 500, 500),
          "off the edge\nand below",
          style(),
        ),
      ),
    ).not.toThrow();
  });
});

describe("drawText(): colors", () => {
  it("without a style, the ink is DEFAULT_FOREGROUND", () => {
    const frame = drawn((canvas) => canvas.drawText(BOX(), "MMMM"));

    expect(distance(inkiest(frame), DEFAULT_FOREGROUND)).toBeLessThan(40);
  });

  it('a style without a color ("initial") is DEFAULT_FOREGROUND too', () => {
    const frame = drawn((canvas) => canvas.drawText(BOX(), "MMMM", style()));

    expect(distance(inkiest(frame), DEFAULT_FOREGROUND)).toBeLessThan(40);
  });

  it("the ink is the style's color", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), "MMMM", style().setColor(RED)),
    );

    expect(distance(inkiest(frame), RED)).toBeLessThan(40);
  });

  it("an ANSI foreground code works too", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), "MMMM", style().setColor("\x1b[38;2;205;49;49m")),
    );

    expect(distance(inkiest(frame), RED)).toBeLessThan(40);
  });

  it("a background is painted behind the characters, spaces too", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(
        BOX(),
        "M   M",
        style().setColor(WHITE).setBackgroundColor(BLUE),
      ),
    );
    const gap = gapIn("M   M");

    frame.show();

    // the top-left corner of the text, and between the two M's
    expect(frame.pixel(10, 10)).eq(BLUE);
    expect(frame.pixel(gap.x, gap.y)).eq(BLUE);
  });

  it("the background covers the text, not the rest of its bounds", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(
        BOX(),
        "MM",
        style().setColor(WHITE).setBackgroundColor(BLUE),
      ),
    );

    expect(frame.pixel(150, 12)).eq(DEFAULT_BACKGROUND);
  });
});

describe("drawText(): attributes", () => {
  it("inverse: a space with default colors is a DEFAULT_FOREGROUND block (the cursor)", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), " ", style().setInverse(true)),
    );

    expect(frame.pixel(11, 11)).eq(DEFAULT_FOREGROUND);
    expect(frame.pixel(13, 18)).eq(DEFAULT_FOREGROUND);
  });

  it("inverse swaps the colors: a foreground block with background ink", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(
        BOX(),
        "M   M",
        style().setColor(WHITE).setBackgroundColor(BLUE).setInverse(true),
      ),
    );
    const gap = gapIn("M   M");

    expect(frame.pixel(gap.x, gap.y)).eq(WHITE);
    expect(distance(inkiest(frame, WHITE, gap.letters), BLUE)).toBeLessThan(40);
  });

  // like CSS visibility: hidden: neither the letters nor their background
  // are painted, so what is under them shows through
  it("hidden: nothing is drawn, not even its background", () => {
    const frame = drawn((canvas) => {
      canvas.fillRect(bounds(0, 0, 200, 60), style().setBackgroundColor(BLUE));
      canvas.drawText(
        BOX(),
        "MMM",
        style().setColor(WHITE).setBackgroundColor(RED).setHidden(true),
      );
    });

    expect(frame.colors(0, 0, frame.width, frame.height)).toEqual(
      new Set([BLUE]),
    );
  });

  it("hidden with no background draws nothing", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), "MMM", style().setColor(WHITE).setHidden(true)),
    );

    expect(inkCount(frame)).eq(0);
  });

  it("bold has more ink than regular", () => {
    const regular = drawn((canvas) =>
      canvas.drawText(BOX(), "MMMM", style().setColor(WHITE)),
    );
    const bold = drawn((canvas) =>
      canvas.drawText(BOX(), "MMMM", style().setColor(WHITE).setBold(true)),
    );

    expect(inkCount(bold)).toBeGreaterThan(inkCount(regular));
  });

  it("italic draws differently from regular", () => {
    const regular = drawn((canvas) =>
      canvas.drawText(BOX(), "llll", style().setColor(WHITE)),
    );
    const italic = drawn((canvas) =>
      canvas.drawText(BOX(), "llll", style().setColor(WHITE).setItalic(true)),
    );

    expect(italic.call.buffer.equals(regular.call.buffer)).eq(false);
  });

  // half strength: no ink brighter than halfway between the background and
  // the color (drawing it twice would be three quarters)
  it("dim is drawn at half strength", () => {
    const dim = drawn((canvas) =>
      canvas.drawText(BOX(), "MMMM", style().setColor(WHITE).setDim(true)),
    );
    const halfway = (rgb(DEFAULT_BACKGROUND)[0] + rgb(WHITE)[0]) / 2;

    expect(brightestChannel(dim)).toBeLessThanOrEqual(halfway + 12);
    expect(inkCount(dim)).toBeGreaterThan(0);
  });

  it("underline: an unbroken line under the letters", () => {
    const regular = drawn((canvas) =>
      canvas.drawText(BOX(), "a  a", style().setColor(WHITE)),
    );
    const underlined = drawn((canvas) =>
      canvas.drawText(
        BOX(),
        "a  a",
        style().setColor(WHITE).setUnderline(true),
      ),
    );

    const letters = inkBox(regular)!;
    const middle = (letters.top + letters.bottom) / 2;

    expect(unbrokenRows(regular, letters.left, letters.right)).toEqual([]);
    const rows = unbrokenRows(underlined, letters.left, letters.right);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((y) => y > middle)).eq(true);
  });

  it("an underlined space still shows the line", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(
        BOX(),
        "    ",
        style().setColor(WHITE).setUnderline(true),
      ),
    );
    const box = inkBox(frame);

    expect(box).not.toBeNull();
    // a line: wider than it is tall
    expect(box!.right - box!.left).toBeGreaterThan(box!.bottom - box!.top);
  });

  it("strikethrough: an unbroken line through the letters", () => {
    const regular = drawn((canvas) =>
      canvas.drawText(BOX(), "a  a", style().setColor(WHITE)),
    );
    const struck = drawn((canvas) =>
      canvas.drawText(
        BOX(),
        "a  a",
        style().setColor(WHITE).setStrikeThrough(true),
      ),
    );
    const letters = inkBox(regular)!;

    struck.show();

    const rows = unbrokenRows(struck, letters.left, letters.right);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((y) => y >= letters.top && y <= letters.bottom)).eq(true);
  });

  // an editor lines code up in columns, so the default font is monospace:
  // "iiii" ends about where "MMMM" does
  it("the default font is monospace", () => {
    const narrow = inkBox(
      drawn((canvas) =>
        canvas.drawText(BOX(), "iiii", style().setColor(WHITE)),
      ),
    )!;
    const wide = inkBox(
      drawn((canvas) =>
        canvas.drawText(BOX(), "MMMM", style().setColor(WHITE)),
      ),
    )!;

    expect((narrow.right - 10) / (wide.right - 10)).toBeGreaterThan(0.75);
  });
});

describe("drawText(): lines", () => {
  it("a TextLayout renders", () => {
    const frame = drawn((canvas) =>
      canvas.drawText(BOX(), layout("ab\ncd"), style().setColor(WHITE)),
    );

    expect(inkCount(frame)).toBeGreaterThan(0);
  });

  it("a tab is as wide as tab_width spaces", () => {
    const spaces = " ".repeat(Configuration().tab_width);
    const withTab = drawn((canvas) =>
      canvas.drawText(BOX(), "\tM", style().setColor(WHITE)),
    );
    const withSpaces = drawn((canvas) =>
      canvas.drawText(BOX(), spaces + "M", style().setColor(WHITE)),
    );

    expect(inkCount(withSpaces)).toBeGreaterThan(0);
    expect(withTab.call.buffer.equals(withSpaces.call.buffer)).eq(true);
  });
});

// like the terminal canvas: the viewport picks lines of a TextLayout, and
// the first one it picks is drawn at the top of the bounds
describe("drawText(): a viewport", () => {
  const draw = (text: string, v?: ViewPort) =>
    drawn(
      (canvas) =>
        canvas.drawText(
          bounds(10, 10, 180, 100),
          layout(text),
          style().setColor(WHITE),
          v,
        ),
      200,
      120,
    );

  // the same pixels as the expected lines drawn on their own (which must
  // show something, or two blank frames would match)
  function expectSame(scrolled: Frame, expected: Frame) {
    expect(inkCount(expected)).toBeGreaterThan(0);
    expect(scrolled.call.buffer.equals(expected.call.buffer)).eq(true);
  }

  it("scrolled one line down, the text looks like it without its first line", () => {
    expectSame(draw("one\ntwo\nthree", viewport(1)), draw("two\nthree"));
  });

  it("visibleLines limits how many lines show", () => {
    expectSame(draw("one\ntwo\nthree", viewport(0, 1)), draw("one"));
  });

  it("firstLine and visibleLines together", () => {
    expectSame(draw("one\ntwo\nthree", viewport(1, 1)), draw("two"));
  });
});

// The clip is CSS overflow: a component whose overflow isn't "visible" keeps
// its children inside it. The renderer sets it per component
// (setClip(component.clipBounds()), already every clipping ancestor
// intersected) and clears it when the frame is done; like the terminal
// canvas, painting outside it leaves the pixels alone.
describe("setClip(): where painting may happen", () => {
  it("starts with no clip: painting goes anywhere", () => {
    const { canvas } = setup();

    expect(canvas.clip()).toBeNull();
  });

  it("clip() gives back the clip that was set, setClip returns the canvas", () => {
    const { canvas } = setup();
    const clip = bounds(5, 5, 10, 10);

    expect(canvas.setClip(clip)).toBe(canvas);
    expect(canvas.clip()).toBe(clip);
  });

  it("fillRect paints only inside the clip", () => {
    // the clip is x 5..14, y 5..14
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(5, 5, 10, 10));
      canvas.fillRect(bounds(0, 0, 30, 30), style().setBackgroundColor(BLUE));
    });

    expect(frame.colors(5, 5, 10, 10)).toEqual(new Set([BLUE]));
    // one pixel out on every side
    expect(frame.pixel(4, 5)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(15, 5)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(5, 4)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(5, 15)).eq(DEFAULT_BACKGROUND);
  });

  it("lineTo draws only inside the clip", () => {
    // the clip is x 4..6
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(4, 0, 3, 10));
      canvas.lineTo({ x: 0, y: 5 }, { x: 20, y: 5 }, style().setBackgroundColor(BLUE));
    });

    expect(frame.colors(4, 5, 3, 1)).toEqual(new Set([BLUE]));
    expect(frame.pixel(3, 5)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(7, 5)).eq(DEFAULT_BACKGROUND);
  });

  it("text stays inside the clip", () => {
    // the bounds reach x 190, the clip only x 29
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(10, 10, 20, 40));
      canvas.drawText(BOX(), "MMMMMMMMMM", style().setColor(WHITE));
    });
    const box = inkBox(frame);

    expect(box).not.toBeNull();
    expect(box!.right).toBeLessThan(30);
  });

  it("so does the text's background", () => {
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(10, 10, 20, 40));
      canvas.drawText(
        BOX(),
        "MMMMMMMMMM",
        style().setColor(WHITE).setBackgroundColor(BLUE),
      );
    });

    expect(frame.pixel(10, 10)).eq(BLUE);
    expect(frame.colors(30, 0, 170, 60)).toEqual(new Set([DEFAULT_BACKGROUND]));
  });

  it("the clip and the text's own bounds both apply: the smaller one wins", () => {
    // the clip reaches x 59, the bounds only x 29
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(10, 10, 50, 40));
      canvas.drawText(bounds(10, 10, 20, 40), "MMMMMMMMMM", style().setColor(WHITE));
    });

    expect(inkBox(frame)!.right).toBeLessThan(30);
  });

  // what CSS does with overflow: hidden on a box with a width of 0
  it("a clip with no width paints nothing", () => {
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(5, 5, 0, 10));
      canvas.fillRect(bounds(0, 0, 30, 30), style().setBackgroundColor(BLUE));
    });

    expect(frame.colors(0, 0, frame.width, frame.height)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });

  it("a new clip replaces the old one", () => {
    // the renderer hands over clips already intersected, so they don't add up
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(0, 0, 5, 5));
      canvas.setClip(bounds(10, 10, 5, 5));
      canvas.fillRect(bounds(0, 0, 30, 30), style().setBackgroundColor(BLUE));
    });

    expect(frame.colors(10, 10, 5, 5)).toEqual(new Set([BLUE]));
    expect(frame.colors(0, 0, 5, 5)).toEqual(new Set([DEFAULT_BACKGROUND]));
  });

  it("setClip(null) paints anywhere again", () => {
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(5, 5, 10, 10));
      canvas.setClip(null);
      canvas.fillRect(bounds(0, 0, 30, 30), style().setBackgroundColor(BLUE));
    });

    expect(frame.colors(0, 0, 30, 30)).toEqual(new Set([BLUE]));
  });

  // text draws inside its own save()/restore(); that must not take the
  // canvas's clip away with it
  it("the clip still holds after drawing text", () => {
    const frame = drawn((canvas) => {
      canvas.setClip(bounds(5, 5, 10, 10));
      canvas.drawText(BOX(), "MM", style().setColor(WHITE));
      canvas.fillRect(bounds(0, 0, 30, 30), style().setBackgroundColor(BLUE));
    });

    expect(frame.pixel(5, 5)).eq(BLUE);
    expect(frame.pixel(2, 2)).eq(DEFAULT_BACKGROUND);
    expect(frame.pixel(20, 20)).eq(DEFAULT_BACKGROUND);
  });

  // like the terminal canvas, whose clear() resets every cell
  it("clear() wipes the whole canvas, clip or not", () => {
    const frame = drawn((canvas) => {
      canvas.fillRect(bounds(0, 0, 200, 60), style().setBackgroundColor(BLUE));
      canvas.setClip(bounds(5, 5, 10, 10));
      canvas.clear();
    });

    expect(frame.colors(0, 0, frame.width, frame.height)).toEqual(
      new Set([DEFAULT_BACKGROUND]),
    );
  });
});

describe("drawing doesn't leave its settings behind", () => {
  it("a fillRect after dim text is full strength", () => {
    const frame = drawn((canvas) => {
      canvas.drawText(BOX(), "MMMM", style().setColor(WHITE).setDim(true));
      canvas.fillRect(bounds(0, 50, 10, 10), style().setBackgroundColor(BLUE));
    });

    expect(frame.colors(0, 50, 10, 10)).toEqual(new Set([BLUE]));
  });

  it("text after bold text is regular", () => {
    const alone = drawn((canvas) =>
      canvas.drawText(bounds(10, 10, 80, 40), "MMMM", style().setColor(WHITE)),
    );
    const afterBold = drawn((canvas) => {
      canvas.drawText(
        bounds(100, 10, 80, 40),
        "MMMM",
        style().setColor(WHITE).setBold(true).setItalic(true),
      );
      canvas.drawText(bounds(10, 10, 80, 40), "MMMM", style().setColor(WHITE));
    });

    expect(inkCount(alone)).toBeGreaterThan(0);
    expect(afterBold.pixels(0, 0, 90, 60)).toEqual(alone.pixels(0, 0, 90, 60));
  });
});
