import colors, { DEFAULT_BACKGROUND, DEFAULT_FOREGROUND } from "./colors.js";
import { ObjectPool } from "../ObjectPool.js";

// a named font first: napi-rs canvas turns the generic "monospace" into a
// proportional font
export const DEFAULT_FONT = "Consolas, monospace";

export class ComponentStyle {
  private static Pool: ObjectPool<ComponentStyle> = new ObjectPool(
    () => new ComponentStyle(),
  );

  // the font size of every style that doesn't set its own: 1 (a cell) on the
  // terminal, pixels in a window (setupEditor.window.connect sets it)
  static FontSize: number = 1;
  // a character's width per pixel of font size; a WindowCanvas measures the
  // real one from its font
  static CharAdvance: number = 0.6;

  private bg: string = DEFAULT_BACKGROUND;
  private cl: string = DEFAULT_FOREGROUND;
  private bld: boolean = false;
  private dsp: string = " ";

  private dm: boolean = false;
  private itc: boolean = false;
  private und: boolean = false;
  private stk: boolean = false;
  private inv: boolean = false;
  private blk: boolean = false;
  private hdn: boolean = false;
  // null: not set, ComponentStyle.FontSize
  private _fontSize: number | null = null;
  private _font: string = DEFAULT_FONT;

  reset() {
    this.bg = colors.BACKGROUND_OFF;
    this.cl = colors.FOREGROUND_OFF;
    this.bld = false;
    this.dsp = " ";
    this.dm = false;
    this.itc = false;
    this.und = false;
    this.stk = false;
    this.inv = false;
    this.blk = false;
    this.hdn = false;
    this._fontSize = null;
    this._font = DEFAULT_FONT;
    return this;
  }

  public fontSize() {
    return this._fontSize ?? ComponentStyle.FontSize;
  }
  setFontSize(fontSize: number) {
    this._fontSize = fontSize;
    return this;
  }
  public font() {
    return this._font;
  }
  setFont(font: string) {
    this._font = font;
    return this;
  }

  public isBold(): boolean {
    return this.bld;
  }
  display() {
    return this.dsp;
  }
  setDisplay(nval: string): ComponentStyle {
    this.dsp = nval;
    return this;
  }

  public setBold(nval: boolean): ComponentStyle {
    this.bld = nval;
    return this;
  }

  public isHidden(): boolean {
    return this.hdn;
  }
  public setHidden(nval: boolean) {
    this.hdn = nval;
    return this;
  }

  public isBlink(): boolean {
    return this.blk;
  }
  public setBlink(nval: boolean) {
    this.blk = nval;
    return this;
  }

  public isInverse(): boolean {
    return this.inv;
  }
  public setInverse(nval: boolean) {
    this.inv = nval;
    return this;
  }

  public isStrikeThrough(): boolean {
    return this.stk;
  }
  public setStrikeThrough(nval: boolean) {
    this.stk = nval;
    return this;
  }

  public isUnderline(): boolean {
    return this.und;
  }
  public setUnderline(nval: boolean) {
    this.und = nval;
    return this;
  }

  public isItalic(): boolean {
    return this.itc;
  }
  public setItalic(nval: boolean) {
    this.itc = nval;
    return this;
  }

  public isDim(): boolean {
    return this.dm;
  }
  public setDim(nval: boolean) {
    this.dm = nval;
    return this;
  }

  public backgroundColor() {
    return this.bg;
  }
  public setBackgroundColor(newColor: string) {
    this.bg = newColor;
    return this;
  }

  public setColor(newColor: string) {
    this.cl = newColor;
    return this;
  }
  public color() {
    return this.cl;
  }
  public static Create() {
    return this.Pool.get();
  }
  // a pooled copy: dispose() it when done
  clone(): ComponentStyle {
    const out = ComponentStyle.Create();

    out.bg = this.bg;
    out.cl = this.cl;
    out.bld = this.bld;
    out.dsp = this.dsp;
    out.dm = this.dm;
    out.itc = this.itc;
    out.und = this.und;
    out.stk = this.stk;
    out.inv = this.inv;
    out.blk = this.blk;
    out.hdn = this.hdn;
    out._fontSize = this._fontSize;
    out._font = this._font;

    return out;
  }

  dispose() {
    ComponentStyle.Pool.retrieve(this.reset());
  }

  blend(
    first: ComponentStyle | undefined | null,
    parent: ComponentStyle | null | undefined,
  ) {
    this.reset();

    const firstBackground = first?.backgroundColor() ?? colors.BACKGROUND_OFF;

    const firstForeground = first?.color() ?? colors.FOREGROUND_OFF;

    const firstDisplay = first?.display() ?? " ";

    this.setDisplay(
      firstDisplay === " " ? (parent?.display() ?? firstDisplay) : firstDisplay,
    );

    this.setBackgroundColor(
      firstBackground === colors.BACKGROUND_OFF
        ? (parent?.backgroundColor() ?? firstBackground)
        : firstBackground,
    ).setColor(
      firstForeground === colors.FOREGROUND_OFF
        ? (parent?.color() ?? firstForeground)
        : firstForeground,
    );

    this.setBold((first?.isBold() ?? false) || (parent?.isBold() ?? false))
      .setDim((first?.isDim() ?? false) || (parent?.isDim() ?? false))
      .setItalic((first?.isItalic() ?? false) || (parent?.isItalic() ?? false))
      .setUnderline(
        (first?.isUnderline() ?? false) || (parent?.isUnderline() ?? false),
      )
      .setFont(first?.font() ?? parent?.font() ?? DEFAULT_FONT)
      .setStrikeThrough(
        (first?.isStrikeThrough() ?? false) ||
          (parent?.isStrikeThrough() ?? false),
      )
      .setInverse(
        (first?.isInverse() ?? false) || (parent?.isInverse() ?? false),
      )
      .setBlink((first?.isBlink() ?? false) || (parent?.isBlink() ?? false))
      .setHidden((first?.isHidden() ?? false) || (parent?.isHidden() ?? false));

    // the first one set wins; neither set stays unset, so it follows
    // ComponentStyle.FontSize
    this._fontSize = first?._fontSize ?? parent?._fontSize ?? null;

    return this;
  }

  public static Blend(
    first: ComponentStyle | undefined | null,
    parent: ComponentStyle | null | undefined,
    defaulted?: ComponentStyle,
  ) {
    return (defaulted ?? this.Create()).blend(first, parent);
  }
}
