import colors from "./ui/colors.js";
import { describe, it, expect } from "vitest";
import { Canvas } from "./ui/canvas.js";
import { DisplayComponent } from "./ui/components.js";
describe("tests the displaying of basic texts in the terminal", () => {
  it("should create a canvas 2x2 and return a string with 4 length because doesnt have anything on it", () => {
    const cnv = new Canvas();

    cnv.setHeight(2).setWidth(2);

    expect(
      cnv.render().length == cnv.width() * cnv.height(),
      "canvas dimensions is not being respected on the thing",
    );
  });

  it("should create a canvas then assign 80 by 80, create a component and assign two children and their heights be 40 and width be 80", () => {
    const h = 80;
    const w = 80;
    const cnv = new Canvas().setHeight(h).setWidth(w) as Canvas;

    cnv.root.addChildren(new DisplayComponent(cnv.root));
    cnv.root.addChildren(new DisplayComponent(cnv.root));

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

    elem.setStartX(3);
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

    expect(nmap[3][3].styles.backgroundColor).toBe(colors.BLUE_BACKGROUND);
  });
});
