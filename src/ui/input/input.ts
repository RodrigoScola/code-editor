import { Cursor } from "../../Editor/Cursor.js";
import { TextBuffer } from "../buffer/Buffer.js";
import { Canvas } from "../canvas.js";
import { DisplayComponent } from "../components.js";
import { ComponentStyle } from "../ComponentStyles.js";

const PLACEHOLDER_STYLE = ComponentStyle.Create().setDim(true);

export class Input extends DisplayComponent {
  cursor: Cursor = new Cursor();
  buffer: TextBuffer = new TextBuffer();
  placeHolderStyle: ComponentStyles = PLACEHOLDER_STYLE;
  placeholder: string = "placeholder";
  currentBufferLine: number = 0;

  constructor() {
    super();
    this.setFocusable(true);
  }

  paint(canvas: Canvas): void {
    this.cursor.ensureVisible(this.viewport());

    let text = this.buffer.at(this.currentBufferLine);
    if (!text) {
      text = this.placeholder;
    }

    canvas.drawText(this.layout().x, this.layout().y, text, this.styles());
  }
  setText(text: string) {
    this.buffer.addLine(text);
    return this;
  }
}
