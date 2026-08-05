import { Canvas } from "../canvas.js";
import { DisplayComponent } from "../components.js";
import { EditorContext } from "../Editor.js";

export class StatusWindow extends DisplayComponent {
  editor: EditorContext;
  constructor(editor: EditorContext) {
    super();
    this.editor = editor;
  }

  paint(canvas: Canvas): void {
    const cl = this.contentLayout();
    canvas.fillRect(cl, this.styles());
    let out = "";

    out += `mode: ${this.editor.modeName}`;

    canvas.drawText(cl.x, cl.y, out, this.styles());
  }
}
