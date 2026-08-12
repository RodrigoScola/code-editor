import colors from "./colors.js";

export class ComponentStyle implements ComponentStyles {
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

  public isBold(): boolean {
    return this.bld;
  }
  display() {
    return this.dsp;
  }
  setDisplay(nval: string): ComponentStyles {
    this.dsp = nval;
    return this;
  }

  public setBold(nval: boolean): ComponentStyles {
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
  public static Blend(
    first: ComponentStyles | undefined | null,
    parent: ComponentStyles | null | undefined,
  ) {
    const st = ComponentStyle.Create();

    const firstBackground = first?.backgroundColor() ?? colors.BACKGROUND_OFF;
    const firstForeground = first?.color() ?? colors.FOREGROUND_OFF;
    const mergeFlag = (child?: boolean, inherited?: boolean) =>
      (child ?? false) || (inherited ?? false);
    const firstDisplay = first?.display() ?? " ";

    st.setDisplay(
      firstDisplay === " " ? (parent?.display() ?? firstDisplay) : firstDisplay,
    );
    st.setBackgroundColor(
      firstBackground === colors.BACKGROUND_OFF
        ? (parent?.backgroundColor() ?? firstBackground)
        : firstBackground,
    )
      .setColor(
        firstForeground === colors.FOREGROUND_OFF
          ? (parent?.color() ?? firstForeground)
          : firstForeground,
      )
      .setBold(mergeFlag(first?.isBold(), parent?.isBold()))
      .setDim(mergeFlag(first?.isDim(), parent?.isDim()))
      .setItalic(mergeFlag(first?.isItalic(), parent?.isItalic()))
      .setUnderline(mergeFlag(first?.isUnderline(), parent?.isUnderline()))
      .setStrikeThrough(
        mergeFlag(first?.isStrikeThrough(), parent?.isStrikeThrough()),
      )
      .setInverse(mergeFlag(first?.isInverse(), parent?.isInverse()))
      .setBlink(mergeFlag(first?.isBlink(), parent?.isBlink()))
      .setHidden(mergeFlag(first?.isHidden(), parent?.isHidden()));

    return st;
  }
}
