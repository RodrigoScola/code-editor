import { assert } from "vitest";
import colors from "./colors.js";

export class ComponentStyle {
  private bg: string = colors.BACKGROUND_OFF;
  private cl: string = colors.FOREGROUND_OFF;
  private bld: boolean = false;
  private dsp: string = " ";

  private dm: boolean = false;
  private itc: boolean = false;
  private und: boolean = false;
  private stk: boolean = false;
  private inv: boolean = false;
  private blk: boolean = false;
  private hdn: boolean = false;

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
    return new ComponentStyle();
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
      .setStrikeThrough(
        (first?.isStrikeThrough() ?? false) ||
          (parent?.isStrikeThrough() ?? false),
      )
      .setInverse(
        (first?.isInverse() ?? false) || (parent?.isInverse() ?? false),
      )
      .setBlink((first?.isBlink() ?? false) || (parent?.isBlink() ?? false))
      .setHidden((first?.isHidden() ?? false) || (parent?.isHidden() ?? false));

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
