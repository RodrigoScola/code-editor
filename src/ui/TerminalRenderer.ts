import { text } from "stream/consumers";
import { assert } from "../assert.js";
import { POSITION_ORDER } from "../constants.js";
import { Canvas } from "./canvas.js";
import colors from "./colors.js";
import { DisplayComponent } from "./display/displayComponent.js";
import { ComponentStyle } from "./ComponentStyles.js";
import { TextLayout } from "./TextLayout/text.js";
import { ViewPort } from "./windows/viewport.js";
import { DisplayLike } from "./layout/layout.js";
import { LayoutBounds } from "./layout/LayoutBounds.js";
import { StatusWindow } from "../Editor/windows/StatusEditor.js";
import { totalmem } from "os";
import { AnsiParser } from "./colors/Parsers/AnsiParser.js";

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
  private _canvas: Canvas = new Canvas();
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

  constructor(canvas: Canvas) {
    if (canvas) {
      this._canvas = canvas;
    }
  }

  static Create(canvas: Canvas) {
    return new TerminalRenderer(canvas);
  }
  build(root: DisplayLike) {
    this._canvas.clear();
    this.paint(root, this._canvas);
    return this;
  }
  getComponents(root: DisplayLike) {
    const components: DisplayLike[] = [];

    const visit = (comp: DisplayLike) => {
      if (!comp.view().visible()) {
        return;
      }
      components.push(comp);

      for (const child of comp.view().children()) {
        visit(child);
      }
    };

    visit(root);

    return components;
  }

  style: ComponentStyle = ComponentStyle.Create()
    .setBackgroundColor(colors.BACKGROUND_OFF)
    .setColor(colors.FOREGROUND_OFF);

  sortComponents(components: DisplayLike[]) {
    return components.sort((aLike, bLike) => {
      const a = aLike.view();
      const b = bLike.view();
      if (this.isAncestor(a, b)) {
        return -1;
      }

      if (this.isAncestor(b, a)) {
        return 1;
      }

      return (
        a.index() - b.index() ||
        POSITION_ORDER[a.positionMode()] - POSITION_ORDER[b.positionMode()]
      );
    });
  }

  private paint(root: DisplayLike, canvas: Canvas) {
    const components = this.getComponents(root);

    this.sortComponents(components);

    let defaultBlend = ComponentStyle.Create();

    for (const componentLike of components) {
      const component = componentLike.view();
      assert(component.visible(), "component should not be visible");
      // children of a component with overflow set stay inside it
      canvas.setClip(component.clipBounds());

      defaultBlend.blend(component.styles(), component.parent()?.styles());
      canvas.fillRect(component.layout(), defaultBlend);
      defaultBlend.reset();

      this.paintBorder(component, canvas);

      component.onPrePaint(canvas);
      component.paint(canvas);

      defaultBlend.blend(component.styles(), component.parent()?.styles());

      this.paintScrollBar(component, canvas);

      // canvas.fillRect(, style)

      canvas.drawText(
        component.contentLayout(),
        component.content(),
        defaultBlend,
        component.viewport(),
      );
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
  private paintScrollBar(component: DisplayComponent, canvas: Canvas) {
    const layout = component.paddingLayout();

    const vertical = component.verticalScrollbar();
    const horizontal = component.horizontalScrollbar();

    if (vertical) {
      const y = layout.y;
      let x = layout.width + layout.x - 1;
      let width = vertical.width();
      let height = layout.height;
      let style = vertical.style();
      const sty = style.clone();

      if (horizontal) {
        height -= horizontal.height();
      }

      const bd = layout
        .clone()
        .setX(x)
        .setY(y)
        .setWidth(width)
        .setHeight(height);

      const trackColor = style.trackColor() || style.backgroundColor();

      canvas.fillRect(bd, sty.setBackgroundColor(trackColor));

      const startAt = bd.y + vertical.offset();
      const endAt = startAt + vertical.size();

      const thumbColor = style.thumbColor() || style.backgroundColor();
      sty.setBackgroundColor(thumbColor);
      for (let i = startAt; i < endAt && vertical.style().thumb(); i++) {
        canvas.drawText(bd.setY(i), vertical.style().thumb()!, sty);
      }
    }

    if (horizontal) {
      const y = layout.y + layout.height - 1;
      const x = layout.x;
      const style = horizontal.style();
      let width = layout.width;
      let height = horizontal.height();

      if (vertical) {
        width -= vertical.width();
      }

      const bd = layout
        .clone()
        .setX(x)
        .setY(y)
        .setHeight(height)
        .setWidth(width);

      assert(style, `invalid  style for horizontal scroll`);

      const trackColor = style.trackColor() || style.backgroundColor();
      const sty = style.clone().setBackgroundColor(trackColor);

      canvas.fillRect(bd, sty);

      const startAt = bd.x + horizontal.offset();
      const endAt = startAt + horizontal.size();

      const thumbColor = style.thumbColor() || style.backgroundColor();

      sty.setBackgroundColor(thumbColor);

      for (let i = startAt; i < endAt && style.thumb(); i++) {
        canvas.drawText(bd.setX(i), style.thumb()!, sty);
      }
      bd.dispose();
      sty.dispose();
    }
  }

  private borderBound: LayoutBounds = LayoutBounds.Create();

  private paintBorder(componentLike: DisplayLike, canvas: Canvas) {
    const component = componentLike.view();
    const bound: LayoutBounds = this.borderBound.reset();
    const border = component.border();

    const cl = component.paddingLayout();
    const out = border.styles().display();

    border.styles().setBackgroundColor(component.styles().backgroundColor());
    if (border.left() > 0) {
      bound
        .setX(cl.x - border.left())
        .setHeight(cl.height + border.top() + border.bottom())
        .setWidth(border.left())
        .setY(cl.y - border.top());

      border.styles().setDisplay(border.borderStyle().left);
      canvas.fillRect(bound, border.styles());
      border.styles().setDisplay(out);
    }

    if (border.right() > 0) {
      bound.setX(cl.x + cl.width);
      bound.setHeight(cl.height + border.top() + border.bottom());
      bound.setWidth(border.right());
      bound.setY(cl.y - border.top());
      border.styles().setDisplay(border.borderStyle().right);
      canvas.fillRect(bound, border.styles());
      border.styles().setDisplay(out);
    }

    if (border.top() > 0) {
      let width = cl.width + border.left() + border.right();

      let text = border.borderStyle().top.repeat(width);

      if (border.left() > 0 && border.right() > 0) {
        text =
          border.borderStyle().top_left +
          text.slice(1, -1) +
          border.borderStyle().top_right;
      }

      bound
        .setX(cl.x - border.left())
        .setHeight(border.top())
        .setWidth(width)
        .setY(cl.y - border.top());

      canvas.fillRect(bound, border.styles());
      canvas.drawText(bound, text, border.styles());
    }

    if (border.bottom() > 0) {
      let width = cl.width + border.left() + border.right();

      let text = border.borderStyle().bottom.repeat(width);

      if (border.left() > 0 && border.right() > 0) {
        text =
          border.borderStyle().bottom_left +
          text.slice(1, -1) +
          border.borderStyle().bottom_right;
      }
      bound
        .setX(cl.x - border.left())
        .setWidth(width)
        .setY(cl.y + cl.height)
        .setHeight(border.bottom());

      canvas.fillRect(bound, border.styles());
      canvas.drawText(bound, text, border.styles());
    }
  }

  private isAncestor(ancestor: DisplayLike, componentLike: DisplayLike) {
    let parent = componentLike.view().parent();

    while (parent) {
      if (parent === ancestor) {
        return true;
      }

      parent = parent.parent();
    }

    return false;
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
