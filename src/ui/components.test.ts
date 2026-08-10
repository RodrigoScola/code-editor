import colors from "./colors.js";
import { describe, it, expect } from "vitest";
import { Canvas } from "./canvas.js";
import { DisplayComponent } from "./components.js";
import { LayoutEngine } from "./layout.js";
import { assert } from "../assert.js";
import { Renderer } from "./renderer.js";
import { TextBuffer } from "./buffer/Buffer.js";
import { TextEditorWindow } from "../Editor/windows/TextEditorWindow.js";
import { MemoryFile, Textdocument } from "../Editor/Documents/TextDocument.js";
import { text } from "stream/consumers";

describe("Canvas", () => {
  it("should create a canvas 2x2 and return a string with 4 length because doesnt have anything on it", () => {
    const cnv = new Canvas();
    const layout: LayoutBounds = LayoutEngine.CreateBounds();
    layout.height = layout.width = 2;

    cnv.setLayout(layout);
    const root = new DisplayComponent().setLayout(layout);
    root.setLayout(layout);

    LayoutEngine.Measure(root, root.contentLayout());

    Renderer.build(root, cnv);

    let out = cnv.getCells().reduce((all, t) => all.concat(t), []);

    expect(out.length, "canvas dimensions is not being respected").toBe(
      cnv.width() * cnv.height(),
    );
  });

  it("applies relative positions using tab-expanded text", () => {
    const cnv = new Canvas();
    const layout: LayoutBounds = LayoutEngine.CreateBounds();
    layout.x = 2;
    layout.y = 3;
    layout.height = 1;
    layout.width = 10;

    const bounds = cnv.applyRelative(3, 1, layout, "a\tb");

    expect(bounds.x).toBe(7);
    expect(bounds.y).toBe(4);
  });
});

describe("Renderer background colors", () => {
  it("should create a 4 x 4 and when called render it should display a string of a", () => {
    const l = LayoutEngine.CreateBounds();
    l.height = l.width = 4;

    const cnv = new Canvas().setLayout(l);

    const elem = new DisplayComponent()
      .setStyles({
        backgroundColor: colors.BLUE_BACKGROUND,
      })
      .setLayout({
        height: 0,
        width: 0,
        x: 2,
        y: 3,
      });

    const root = new DisplayComponent().setLayout(l).addChildren(elem);
    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.build(root, cnv);

    const nmap = cnv.getCells();

    expect(nmap[3][2].styles.backgroundColor).toBe(colors.BLUE_BACKGROUND);
  });

  it("sets max render and both the top and bottom respect it", () => {
    const l = LayoutEngine.CreateBounds();
    l.width = l.height = 10;

    const cnv = new Canvas().setLayout(l);
    const root = new DisplayComponent().setLayout(l);

    root.addChildren([
      new DisplayComponent().setStyles({
        backgroundColor: colors.MAGENTA_BACKGROUND,
      }),
      new DisplayComponent()
        .setStyles({ backgroundColor: colors.YELLOW_BACKGROUND })
        .setMaxH(1),
    ]);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.build(root, cnv);

    const firstCell = cnv.getCell(0, 0);
    const oneLineCell = cnv.getCell(0, cnv.layout().height - 1);
    const magentaCell = cnv.getCell(0, cnv.layout().height - 2);

    assert(firstCell, `invalid cell `);
    assert(oneLineCell, `invalid cell `);
    assert(magentaCell, `invalid nextCell at `);

    // this is to make sure the first and second most line are the same component
    expect(
      firstCell.styles.backgroundColor,
      "has the same color as the out",
    ).toBe(colors.MAGENTA_BACKGROUND);

    expect(
      oneLineCell.styles.backgroundColor,
      "has the same color as the oneline",
    ).toBe(colors.YELLOW_BACKGROUND);

    expect(
      magentaCell.styles.backgroundColor,
      "has the same color as the out",
    ).toBe(colors.MAGENTA_BACKGROUND);
  });

  it("preserves the order and the height automatically", () => {
    const l = LayoutEngine.CreateBounds();
    l.height = 9;
    l.width = 3;

    const cnv = new Canvas().setLayout(l);
    const root = new DisplayComponent()
      .setLayout(cnv.layout())
      .addChildren(
        new DisplayComponent().setStyles({
          backgroundColor: colors.MAGENTA_BACKGROUND,
        }),
      )
      .addChildren(
        new DisplayComponent()
          .setStyles({ backgroundColor: colors.YELLOW_BACKGROUND })
          .setMaxH(1),
      )
      .addChildren(
        new DisplayComponent().setStyles({
          backgroundColor: colors.MAGENTA_BACKGROUND,
        }),
      );

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.build(root, cnv);
    const map = cnv.getCells();

    expect(map[4][0].styles.backgroundColor).eq(colors.YELLOW_BACKGROUND);
    expect(map[3][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
    expect(map[5][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
    expect(map[l.height - 1][0].styles.backgroundColor).eq(
      colors.MAGENTA_BACKGROUND,
    );
  });

  it("sets max render and both the top and bottom respect it", () => {
    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;

    const cnv = new Canvas().setLayout(layout);

    const root = new DisplayComponent()
      .setLayout(layout)
      .setDirection("horizontal")
      .addChildren([
        new DisplayComponent().setStyles({
          backgroundColor: colors.MAGENTA_BACKGROUND,
        }),
        new DisplayComponent()
          .setStyles({ backgroundColor: colors.YELLOW_BACKGROUND })
          .setMaxW(1),
      ]);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.build(root, cnv);

    const w = layout.width;

    const built = cnv.getCells();
    expect(
      built[0][w - 1].styles.backgroundColor,
      "has the same color as the oneline",
    ).toBe(colors.YELLOW_BACKGROUND);
    expect(
      built[0][w - 2].styles.backgroundColor,
      "has the same color as the out",
    ).toBe(colors.MAGENTA_BACKGROUND);
  });
});

describe("editorComponent", () => {
  it("the height of the text should be 1 by default", () => {
    const content = "this is the first line\nthis is the second line";

    const display = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", content)),
    );

    const layout = LayoutEngine.CreateBounds();
    layout.height = layout.width = 10;
    const root = new DisplayComponent().setLayout(layout);

    const cnv = new Canvas().setLayout(layout);

    root.addChildren(display.window);

    LayoutEngine.Measure(root, root.contentLayout());
    Renderer.build(root, cnv);

    const firstLineCell = cnv.getCell(0, 0);
    expect(firstLineCell, "invalid cell");
    expect(firstLineCell).toBeDefined();

    const secondLineCell = cnv.getCell(0, 1);
    expect(secondLineCell, "invalid cell");
    expect(secondLineCell).toBeDefined();

    expect(
      firstLineCell!.display,
      "text should display on the first line",
    ).toEqual(display.buffer.at(0)!.at(0));

    expect(
      secondLineCell!.display,
      "text should display on the second line",
    ).toEqual(display.buffer.at(1)!.at(0));
  });

  it("keeps the cursor visible by scrolling the viewport", () => {
    const content = ["one", "two", "three", "four"].join("\n");
    const display = new TextEditorWindow(
      new Textdocument(new MemoryFile("doc", content)),
    );

    display.viewPort.visibleLines = 3;
    display.viewPort.visibleColumns = 10;
    display.cursor.line = 3;

    display.cursor.ensureCursorVisible(display.viewPort);

    expect(display.viewPort.firstLine).toBe(1);
  });
});
