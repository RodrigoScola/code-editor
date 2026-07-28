import colors from "./ui/colors.js";
import { describe, it, expect } from "vitest";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent, TextDisplay } from "./ui/components.js";
describe("tests the displaying of basic texts in the terminal", () => {
  it("should create a canvas 2x2 and return a string with 4 length because doesnt have anything on it", () => {
    const cnv = new Canvas();

    cnv.setHeight(2).setWidth(2);

    let out = cnv.build().reduce((all, t) => all.concat(t), []);

    expect(
      out.length,
      "canvas dimensions is not being respected on the thing",
    ).toBe(cnv.width() * cnv.height());
  });
  it("tests the default height and width on canvas", () => {
    const h = 80;
    const w = 80;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    expect(cnv.root.height(), "canvas not applying height to root?").toEqual(h);
    expect(cnv.root.width(), "canvas not applying width to root?").toEqual(w);
  });

  it("should create a canvas then assign 80 by 80, create a component and assign two children and their heights be 40 and width be 80", () => {
    const h = 80;
    const w = 80;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    cnv.root.addChildren([new DisplayComponent(), new DisplayComponent()]);

    for (const child of cnv.root.children()) {
      expect(child.parent(), `parent is not defined?`).toBeDefined();
      expect(
        child.height(),
        `height is not being properly displayed?, expected ${h / 2}, got ${child.height()}`,
      ).toEqual(h / 2);
      expect(
        child.width(),
        `width is not being properly displayed?, expected ${w}, got ${child.width()}`,
      ).toEqual(w);
    }
  });
  it("should create a 4 x 4 and when called render it should display a string of a", () => {
    const h = 4;
    const w = 4;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    const elem = new DisplayComponent();

    elem.setStyles({
      backgroundColor: colors.BLUE_BACKGROUND,
    });

    cnv.root.addChildren(elem.setStartX(2).setStartY(3));

    const nmap = cnv.build(cnv.canvas);

    expect(nmap[3][2].styles.backgroundColor).toBe(colors.BLUE_BACKGROUND);
  });
  it("sets max render and both the top and bottom respect it", () => {
    const h = 10;
    const w = 10;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    const out = new DisplayComponent();
    out.setStyles({ backgroundColor: colors.MAGENTA_BACKGROUND });

    const oneLine = new DisplayComponent();
    oneLine.setStyles({ backgroundColor: colors.YELLOW_BACKGROUND });
    oneLine.setMaxH(1);

    cnv.addChildren([out, oneLine]);

    const built = cnv.build();

    console.log(JSON.stringify(colors.BACKGROUND_OFF));

    console.log(built.map((b) => b[0].styles));

    expect(
      built[h - 1][0].styles.backgroundColor,
      "has the same color as the oneline",
    ).toBe(colors.YELLOW_BACKGROUND);
    expect(
      built[h - 2][0].styles.backgroundColor,
      "has the same color as the out",
    ).toBe(colors.MAGENTA_BACKGROUND);
  });
  it("preserves the order and the height automatically", () => {
    const h = 9;
    const w = 3;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    const out = new DisplayComponent();
    out.setStyles({ backgroundColor: colors.MAGENTA_BACKGROUND });

    const oneLine = new DisplayComponent()
      .setStyles({ backgroundColor: colors.YELLOW_BACKGROUND })
      .setMaxH(1);

    const out2 = new DisplayComponent().setStyles({
      backgroundColor: colors.MAGENTA_BACKGROUND,
    });

    cnv.addChildren(out).addChildren(oneLine).addChildren(out2);

    const map = cnv.build();
    expect(map[4][0].styles.backgroundColor).eq(colors.YELLOW_BACKGROUND);
    expect(map[3][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
    expect(map[5][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
    expect(map[h - 1][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
  });

  it("should create a canvas then assign 80 by 80, create a component and assign two children and their heights be 40 and width be 80", () => {
    const h = 80;
    const w = 80;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    cnv.root.setDirection("horizontal");

    cnv.root.addChildren([new DisplayComponent(), new DisplayComponent()]);

    for (const child of cnv.root.children()) {
      expect(child.parent(), `parent is not defined?`).toBeDefined();
      expect(
        child.height(),
        `height is not being properly displayed?, expected ${h}, got ${child.height()}`,
      ).toEqual(h);
      expect(
        child.width(),
        `width is not being properly displayed?, expected ${w / 2}, got ${child.width()}`,
      ).toEqual(w / 2);
    }
  });
  it("sets max render and both the top and bottom respect it", () => {
    const h = 10;
    const w = 10;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    cnv
      .setDirection("horizontal")

      .addChildren([
        new DisplayComponent().setStyles({
          backgroundColor: colors.MAGENTA_BACKGROUND,
        }),

        new DisplayComponent()
          .setStyles({ backgroundColor: colors.YELLOW_BACKGROUND })
          .setMaxW(1),
      ]);

    const built = cnv.build();

    expect(
      built[0][w - 1].styles.backgroundColor,
      "has the same color as the oneline",
    ).toBe(colors.YELLOW_BACKGROUND);
    expect(
      built[0][w - 2].styles.backgroundColor,
      "has the same color as the out",
    ).toBe(colors.MAGENTA_BACKGROUND);
  });
  it("the height of the text should be 1 by default", () => {
    const firstLine = new TextDisplay().setContent("this is the first line");
    const secondLine = new TextDisplay().setContent("this is the second line");

    const cnv = new Canvas() as Canvas;

    cnv.setHeight(10).setWidth(10);
    cnv.addChildren([firstLine, secondLine]);

    cnv.build();

    expect(
      cnv.canvas[0][0].display,
      "text should display on the first line",
    ).toEqual(firstLine.content().at(0));
    expect(
      cnv.canvas[1][0].display,
      "text should display on the second line",
    ).toEqual(secondLine.content().at(0));
  });
});
