import assert from "assert";
import { blendStyles, Canvas } from "./canvas.js";
import colors from "./colors.js";

export class Renderer {
  static build(root: Component, canvas: Canvas) {
    this.paint(root, canvas);
  }
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
    for (let y = canvas.startY(); y < canvas.startY() + canvas.height(); y++) {
      let row = "";
      for (let x = canvas.startX(); x < canvas.startX() + canvas.width(); x++) {
        const tile = canvas.getCell(x, y);

        assert(tile, `invalid tile came out at x:${x}, y:${y}`);
        assert(
          tile.display.length == 1,
          "cannot display more things on one cell",
        );

        row += `${tile.styles.backgroundColor}${tile.styles.color}${tile.display}`;

        const nextTile = canvas.getCell(x + 1, y);

        if (nextTile) {
          if (nextTile.styles.backgroundColor !== tile.styles.backgroundColor) {
            row += colors.BACKGROUND_OFF;
          }
          if (nextTile.styles.color !== tile.styles.backgroundColor) {
            row += colors.FOREGROUND_OFF;
          }
        } else {
          row += `${colors.BACKGROUND_OFF}${colors.FOREGROUND_OFF}`;
        }
      }
      rows.push(row);
    }
    return rows.join("\r\n");
  }
}
