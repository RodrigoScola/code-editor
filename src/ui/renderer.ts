import assert from "assert";
import { blendStyles, Canvas } from "./canvas.js";
import colors from "./colors.js";

export class Renderer {
  static build(root: Component, canvas: Canvas) {
    canvas.clear();
    this.paint(root, canvas);
  }

  static currentBackground: string = colors.BACKGROUND_OFF;
  static currentForeGround: string = colors.FOREGROUND_OFF;
  private static paint(root: Component, canvas: Canvas) {
    canvas.fillRect(
      root.layout(),
      blendStyles(root.styles(), root.parent()?.styles()),
    );
    root.paint(canvas);

    for (const child of root.children()) {
      this.paint(child, canvas);
    }
  }
  static render(canvas: Canvas) {
    const rows: string[] = [];
    // i know theres some optimization that we can do here
    for (let i = canvas.startY(); i < canvas.startY() + canvas.height(); i++) {
      let row = "";
      for (let j = canvas.startX(); j < canvas.startX() + canvas.width(); j++) {
        const tile = canvas.getCell(j, i);

        assert(tile, `invalid tile came out at x:${j}, y:${i}`);
        assert(
          tile.display.length == 1,
          "cannot display more things on one cell",
        );
        if (this.currentBackground !== tile.styles.backgroundColor) {
          this.currentBackground = tile.styles.backgroundColor;
          row += tile.styles.backgroundColor;
        }

        if (this.currentBackground !== tile.styles.color) {
          this.currentBackground = tile.styles.color;
          row += tile.styles.color;
        }
        row += tile.display;
      }
      rows.push(row);
    }
    return rows.join("\r\n");
  }
}
