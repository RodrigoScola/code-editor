import colors from "./ui/colors.js";
import { describe, it, expect } from "vitest";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent } from "./ui/components.js";
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

  it("should create a canvas then assign 80 by 80, create a component and assign two children and their heights be 40 and width be 80", () => {
    const h = 80;
    const w = 80;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    cnv.root.addChildren([
      new DisplayComponent(cnv.root),
      new DisplayComponent(cnv.root),
    ]);

    for (const child of cnv.root.children()) {
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

    const elem = new DisplayComponent(cnv.root);

    elem.styles.backgroundColor = colors.BLUE_BACKGROUND;

    elem.setStartX(2);
    elem.setStartY(3);

    cnv.root.addChildren(elem);

    const nmap = cnv.build(cnv.canvas);
    console.log(JSON.stringify(colors.BLUE_BACKGROUND));
    console.log(JSON.stringify(nmap, null, 2));
    console.log(
      JSON.stringify(nmap[2][3].styles.backgroundColor) ===
        colors.BLUE_BACKGROUND,
      "thisi expec",
    );

    expect(nmap[3][2].styles.backgroundColor).toBe(colors.BLUE_BACKGROUND);
  });
  it("sets max render and both the top and bottom respect it", () => {
    const h = 3;
    const w = 80;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    const out = new DisplayComponent(cnv);
    out.styles.backgroundColor = colors.MAGENTA_BACKGROUND;

    const oneLine = new DisplayComponent(cnv);
    oneLine.styles.backgroundColor = colors.YELLOW_BACKGROUND;
    oneLine.setMaxH(1);

    cnv.addChildren(out);
    cnv.addChildren(oneLine);

    const built = cnv.build();

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

    const out = new DisplayComponent(cnv);
    out.styles.backgroundColor = colors.MAGENTA_BACKGROUND;

    const oneLine = new DisplayComponent(cnv);
    oneLine.styles.backgroundColor = colors.YELLOW_BACKGROUND;
    oneLine.setMaxH(1);

    const out2 = new DisplayComponent(cnv);
    out.styles.backgroundColor = colors.MAGENTA_BACKGROUND;
    out2.styles.backgroundColor = colors.MAGENTA_BACKGROUND;

    cnv.addChildren(out).addChildren(oneLine).addChildren(out2);

    const map = cnv.build();
    expect(map[4][0].styles.backgroundColor).eq(colors.YELLOW_BACKGROUND);
    expect(map[3][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
    expect(map[5][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
    expect(map[h - 1][0].styles.backgroundColor).eq(colors.MAGENTA_BACKGROUND);
  });
});
