import { Canvas } from "../../ui/canvas.js";
import colors from "../../ui/colors.js";
import { EditorContext } from "../Editor/Editor.js";
import { LayoutDimensions } from "../../ui/layout/LayoutDimensions.js";
import { UiInput } from "../../ui/components/UiInput.js";

export class StatusWindow extends UiInput {
  editor: EditorContext;

  constructor(editor: EditorContext) {
    super();
    this.setMultilineEnabled(true);

    this.editor = editor;
  }

  paint(canvas: Canvas): void {
    const cl = this.view().contentLayout();
    canvas.fillRect(cl, this.view().styles());

    let out = "";

    if (this.editor.modeName === "command") {
      out += `command: ${this.buffer().at(this.currentCommandLine) || ""} `;
    } else {
      out += `mode: ${this.editor.modeName} -`;
      out += `current memory ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB - `;
      out += `total memory ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)}MB - `;
    }

    canvas.drawText(cl, out, this.view().styles());

    if (this.editor.modeName === "command") {
      const content = this.buffer().at(this.cursor().line);
      let len = `command: `.length + (content?.length ?? 0);

      canvas.fillRect(
        LayoutDimensions.ApplyRelative(len, 0, this.view().contentLayout()),
        this.cursor().style,
      );
    }
  }
  onEvent(event: EditorEvents): void {
    super.onEvent(event);

    if (event.name === "editorModeChange") {
      if (event.mode === "command") {
        this.cursor().style.setBackgroundColor(colors.RED_BACKGROUND);
        this.cursor().style.setColor(colors.WHITE_FOREGROUND);

        this.currentCommandLine = Math.max(this.buffer().count() - 1, 0);
        this.moveCursorDown();
      }
    }
  }
}
