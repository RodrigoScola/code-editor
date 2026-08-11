import assert from "assert";
import { Canvas } from "./canvas.js";
import colors from "./colors.js";
import { ComponentStyle } from "./ComponentStyles.js";

export class Renderer {
  static Create() {
    return new Renderer();
  }
  build(root: Component, canvas: Canvas) {
    canvas.clear();
    this.paint(root, canvas);
  }

  style: ComponentStyles = ComponentStyle.Create()
    .setBackgroundColor(colors.BACKGROUND_OFF)
    .setColor(colors.FOREGROUND_OFF);

  private paint(root: Component, canvas: Canvas) {
    canvas.fillRect(
      root.layout(),
      ComponentStyle.Blend(root.styles(), root.parent()?.styles()),
    );
    root.paint(canvas);

    for (const child of root.children()) {
      this.paint(child, canvas);
    }
  }
  render(canvas: Canvas) {
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
        if (this.style.backgroundColor() !== tile.styles.backgroundColor()) {
          this.style.setBackgroundColor(tile.styles.backgroundColor());
          row += tile.styles.backgroundColor();
        }

        if (this.style.color() !== tile.styles.color()) {
          this.style.setColor(tile.styles.color());
          row += tile.styles.color();
        }

        if (this.style.isDim() !== tile.styles.isDim()) {
          this.style.setDim(tile.styles.isDim());
          row += tile.styles.isDim();
        }

        if (this.style.isItalic() !== tile.styles.isItalic()) {
          this.style.setItalic(tile.styles.isItalic());
          row += tile.styles.isItalic();
        }
        if (this.style.isUnderline() !== tile.styles.isUnderline()) {
          this.style.setUnderline(tile.styles.isUnderline());
          row += tile.styles.isUnderline();
        }
        if (this.style.isStrikeThrough() !== tile.styles.isStrikeThrough()) {
          this.style.setStrikeThrough(tile.styles.isStrikeThrough());
          row += tile.styles.isStrikeThrough();
        }
        if (this.style.isInverse() !== tile.styles.isInverse()) {
          this.style.setInverse(tile.styles.isInverse());
          row += tile.styles.isInverse();
        }
        if (this.style.isBlink() !== tile.styles.isBlink()) {
          this.style.setBlink(tile.styles.isBlink());
          row += tile.styles.isBlink();
        }
        if (this.style.isHidden() !== tile.styles.isHidden()) {
          this.style.setHidden(tile.styles.isHidden());
          row += tile.styles.isHidden();
        }
        if (this.style.isBold() !== tile.styles.isBold()) {
          this.style.setBold(tile.styles.isBold());
          row += tile.styles.isBold();
        }
        row += tile.display;
      }
      rows.push(row);
    }
    return rows.join("\r\n");
  }
}
