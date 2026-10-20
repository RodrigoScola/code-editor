import { assert } from "../../assert.js";
import { TerminalCanvas } from "../Canvas/TerminalCanvas.js";
import colors from "../colors.js";
import { DisplayComponent } from "../display/displayComponent.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { DisplayLike } from "../layout/layout.js";
import { LayoutBounds } from "../layout/LayoutBounds.js";
import { AnsiParser } from "../colors/Parsers/AnsiParser.js";
import { Rendering } from "./Renderer.js";
import { PixelWindow } from './WindowRenderer.js';

// where a finished frame goes: the terminal in the app, console.log in tests
export type RenderOutput = (frame: string) => void;

// a cell as the terminal shows it, kept by value: the canvas gets new style
// objects every frame, so comparing them by reference would always differ
type SentCell = {
  display: string;
  background: string;
  color: string;
  attributes: number;
};

const RESET = "\x1b[0m";
const HOME = "\x1b[H";

export interface Renderer {
  build(dp: DisplayLike): Renderer;
  render(): void;
  setLayout(layout: LayoutBounds): Renderer;
  layout(): LayoutBounds;
  frame(): string;
  isTerminalRenderer(): boolean;
  isWindowRenderer(): boolean;
  invalidate(): void;
}

export class TerminalRenderer implements Renderer {
  private _canvas: TerminalCanvas = new TerminalCanvas();
  private _output: RenderOutput = (frame) => console.log(frame);

  // what the terminal shows: the last frame sent, row by row. null until
  // the first frame and after invalidate(), so the next frame is a full one
  private _sent: SentCell[][] | null = null;

  layout() {
    return this._canvas.layout();
  }
  // the painted cells of the last frame
  canvas() {
    return this._canvas;
  }
  setLayout(layout: LayoutBounds) {
    this._canvas.setLayout(layout);

    return this;
  }
  setOutput(output: RenderOutput) {
    this._output = output;
    return this;
  }

  constructor(canvas: TerminalCanvas) {
    if (canvas) {
      this._canvas = canvas;
    }
  }

  static Create(canvas: TerminalCanvas) {
    return new TerminalRenderer(canvas);
  }
  build(root: DisplayLike) {
    this._canvas.clear();
    this.paint(root);
    return this;
  }

  style: ComponentStyle = ComponentStyle.Create()
    .setBackgroundColor(colors.BACKGROUND_OFF)
    .setColor(colors.FOREGROUND_OFF);

  private paint(root: DisplayLike) {
    const components = Rendering.GetComponents(root);
    const canvas = this._canvas;

    Rendering.SortComponents(components);

    let defaultBlend = ComponentStyle.Create();

    for (const componentLike of components) {
      const component = componentLike.view();
      assert(component.visible(), "component should not be visible");
      // children of a component with overflow set stay inside it
      canvas.setClip(component.clipBounds());

      defaultBlend.blend(component.styles(), component.parent()?.styles());
      canvas.fillRect(component.layout(), defaultBlend);
      defaultBlend.reset();

      Rendering.Border(component, canvas);

      component.onPrePaint(canvas);
      component.paint(canvas);

      defaultBlend.blend(component.styles(), component.parent()?.styles());

      Rendering.ScrollBar(component, canvas);

      Rendering.Content(component, canvas, defaultBlend);

      defaultBlend.reset();
    }
    for (const componentLike of components) {
      const component = componentLike.view();
      canvas.setClip(component.clipBounds());
      component.postPaint(canvas);
    }
    canvas.setClip(null);

    defaultBlend.dispose();
  }

  paintLine() {}

  // the next frame sends every cell, e.g. after something else drew over
  // the terminal
  invalidate() {
    this._sent = null;
    return this;
  }

  // sends the output what changed on the canvas since the last frame and
  // returns it. The first frame (and the first after invalidate() or a
  // resize) is the whole screen; after that only the changed cells are sent,
  // each run of them starting with a cursor move. Nothing changed, nothing
  // is sent: the frame is "". Every frame leaves the terminal's style reset
  render(): string {
    const frame = this.needsFullFrame()
      ? HOME + this.frame()
      : this.changedCells();

    this.remember();
    this._output(frame);
    return frame;
  }

  // the whole canvas as text with its colors, rows joined by "\r\n", without
  // moving the cursor. Sends nothing: render() is what draws
  frame(): string {
    this.style.reset();
    const rows: string[] = [];

    for (const cells of this._canvas.getCells()) {
      let row = "";
      for (const tile of cells) {
        row += this.cellText(tile.styles);
      }
      rows.push(row);
    }

    return RESET + rows.join("\r\n") + this.resetStyle();
  }

  private needsFullFrame() {
    const sent = this._sent;

    return (
      sent === null ||
      sent.length !== this._canvas.height() ||
      (sent[0]?.length ?? 0) !== this._canvas.width()
    );
  }

  private changedCells(): string {
    const sent = this._sent!;
    const rows = this._canvas.getCells();
    let frame = "";

    for (let y = 0; y < rows.length; y++) {
      const cells = rows[y];
      let x = 0;

      while (x < cells.length) {
        if (sameCell(sent[y][x], cells[x].styles)) {
          x++;
          continue;
        }

        // ESC[row;colH counts from 1
        frame += `\x1b[${y + 1};${x + 1}H`;

        while (x < cells.length && !sameCell(sent[y][x], cells[x].styles)) {
          frame += this.cellText(cells[x].styles);
          x++;
        }
      }
    }

    return frame === "" ? "" : frame + this.resetStyle();
  }

  // copies the canvas into _sent, reusing its cells when the size is the same
  private remember() {
    const rows = this._canvas.getCells();

    if (this.needsFullFrame()) {
      this._sent = rows.map((cells) =>
        cells.map(() => ({
          display: "",
          background: "",
          color: "",
          attributes: 0,
        })),
      );
    }

    const sent = this._sent!;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const style = rows[y][x].styles;
        const cell = sent[y][x];

        cell.display = style.display();
        cell.background = style.backgroundColor();
        cell.color = style.color();
        cell.attributes = attributeBits(style);
      }
    }
  }

  private resetStyle() {
    this.style.reset();
    return RESET;
  }

  // the codes that switch the terminal from this.style to the cell's style,
  // then the cell's character
  private cellText(tile: ComponentStyle): string {
    assert(
      tile.display().length == 1,
      "cannot display more things on one cell",
    );
    let text = "";
    const background = tile.backgroundColor();
    const color = tile.color();

    if (this.style.backgroundColor() !== background) {
      this.style.setBackgroundColor(background);
      const color = AnsiParser.toTerminal(background, true);
      text += color;
    }

    if (this.style.color() !== color) {
      this.style.setColor(color);

      let fontColor = AnsiParser.toTerminal(color, false);
      text += fontColor;
    }

    // bold and dim share their "off" code (22), so turning one off turns
    // both off; switch them together to put back the one that stays on
    if (
      this.style.isDim() !== tile.isDim() ||
      this.style.isBold() !== tile.isBold()
    ) {
      if (
        (this.style.isDim() && !tile.isDim()) ||
        (this.style.isBold() && !tile.isBold())
      ) {
        text += "\x1b[22m";
        this.style.setDim(false).setBold(false);
      }
      if (tile.isDim() && !this.style.isDim()) {
        text += "\x1b[2m";
      }
      if (tile.isBold() && !this.style.isBold()) {
        text += "\x1b[1m";
      }
      this.style.setDim(tile.isDim()).setBold(tile.isBold());
    }

    if (this.style.isItalic() !== tile.isItalic()) {
      this.style.setItalic(tile.isItalic());
      text += tile.isItalic() ? "\x1b[3m" : "\x1b[23m";
    }

    if (this.style.isUnderline() !== tile.isUnderline()) {
      this.style.setUnderline(tile.isUnderline());
      text += tile.isUnderline() ? "\x1b[4m" : "\x1b[24m";
    }

    if (this.style.isStrikeThrough() !== tile.isStrikeThrough()) {
      this.style.setStrikeThrough(tile.isStrikeThrough());
      text += tile.isStrikeThrough() ? "\x1b[9m" : "\x1b[29m";
    }

    if (this.style.isInverse() !== tile.isInverse()) {
      this.style.setInverse(tile.isInverse());
      text += tile.isInverse() ? "\x1b[7m" : "\x1b[27m";
    }

    if (this.style.isBlink() !== tile.isBlink()) {
      this.style.setBlink(tile.isBlink());
      text += tile.isBlink() ? "\x1b[5m" : "\x1b[25m";
    }

    if (this.style.isHidden() !== tile.isHidden()) {
      this.style.setHidden(tile.isHidden());
      text += tile.isHidden() ? "\x1b[8m" : "\x1b[28m";
    }

    return text + tile.display();
  }

  static isTerminalRenderer(
    t: Renderer | undefined | null,
  ): asserts t is TerminalRenderer {
    if (!(t instanceof TerminalRenderer)) {
      throw new Error("Expected an Terminal renderer");
    }
  }

  isTerminalRenderer(): boolean {
    return true;
  }
  isWindowRenderer(): boolean {
    return false;
  }
}

function sameCell(sent: SentCell, style: ComponentStyle) {
  return (
    sent.display === style.display() &&
    sent.background === style.backgroundColor() &&
    sent.color === style.color() &&
    sent.attributes === attributeBits(style)
  );
}

function attributeBits(style: ComponentStyle) {
  return (
    (style.isBold() ? 1 : 0) |
    (style.isDim() ? 2 : 0) |
    (style.isItalic() ? 4 : 0) |
    (style.isUnderline() ? 8 : 0) |
    (style.isStrikeThrough() ? 16 : 0) |
    (style.isInverse() ? 32 : 0) |
    (style.isBlink() ? 64 : 0) |
    (style.isHidden() ? 128 : 0)
  );
}

// a rendered frame without its colors and cursor codes
export function stripAnsi(text: string) {
  return text.replace(/\x1b\[[0-9;?<>]*[A-Za-z]/g, "");
}
