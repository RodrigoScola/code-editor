import { TextBuffer } from "../buffer/Buffer.js";
import { Canvas } from "../canvas.js";
import { ComponentStyle } from "../ComponentStyles.js";
import { Renderer } from "../renderer.js";
import { TextLayout } from "../TextLayout/text.js";
import { UiComponent, UIScreen } from "./UiComponent.js";

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
    this.buffer().addLine("");

    if (value) {
      this.buffer().addLine(value || "");
      for (let i = 0; i < (value?.length || 0); i++) {
        this.cursor().moveRight();
      }
    }
  }

  setMultilineEnabled(val: boolean) {
    return this._multiline;
  }

  paint(canvas: Canvas): void {
    super.paint(canvas);
    const line = this.buffer().at(this.currentCommandLine);
    if (!line || line.trim().length == 0) {
      Renderer.Create().paintContent(
        this.view().contentLayout(),
        this.placeholder,
        canvas,
        ComponentStyle.Blend(this.placeholderStyle, this.view().styles()),
      );
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
      this.buffer().newLine();
    }
  }
}
