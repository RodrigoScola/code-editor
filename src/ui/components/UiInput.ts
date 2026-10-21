import { EditorContext } from "../../Editor/EditorContext.js";
import { TextBuffer } from "../text/Buffer.js";
import { ICanvas } from "../Canvas/TerminalCanvas.js";
import { ComponentStyle } from "../styles/ComponentStyles.js";
import { TextLayout } from "../text/text.js";
import { UIScreen } from "./UiScreen/UIScreen.js";

export class UiInput extends UIScreen {
  currentCommandLine: number = 0;

  placeholder: TextLayout = new TextLayout().setBuffer(
    new TextBuffer("placeholder text"),
  );

  placeholderStyle: ComponentStyle = ComponentStyle.Create().setDim(true);

  private _multiline: boolean = false;

  constructor(value?: string) {
    super();

    this.view().setMaxHeight(1);

    if (value) {
      this.buffer().append(value || "");
      for (let i = 0; i < (value?.length || 0); i++) {
        this.cursor().moveRight();
      }
    } else {
      this.buffer().append("");
    }
  }

  multiLine() {
    return this._multiline;
  }
  setMultilineEnabled(val: boolean) {
    this._multiline = false;
    return this;
  }

  paint(canvas: ICanvas): void {
    super.paint(canvas);
    const line = this.buffer().at(this.currentCommandLine);
    if (!line || line.trim().length == 0) {
      canvas.drawText(
        this.view().contentLayout(),
        this.placeholder,
        ComponentStyle.Blend(this.placeholderStyle, this.view().styles()),
      );
    }
  }
  onPostPaint(canvas: ICanvas): void {
    if (this.cursor().hasSelection()) {
      this.cursor().paintSelection(canvas);
    }
  }

  previousLine() {
    if (!this._multiline) {
      return;
    }
    this.currentCommandLine = Math.max(0, this.currentCommandLine - 1);
  }

  nextLine() {
    if (!this._multiline) {
      return;
    }
    this.currentCommandLine = Math.max(
      Math.min(this.buffer().count() - 1, this.currentCommandLine + 1),
      0,
    );
  }
  onEvent(event: EditorEvents): void {
    if (event.name === "submitCommand") {
      this.currentCommandLine++;
      this.nextLine();
      this.buffer().append();
    }
  }
  onEnter(ctx: EditorContext): void {
    if (this._multiline) {
      super.onEnter(ctx);
      return;
    }
  }
}
