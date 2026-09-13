import colors from "../../ui/colors.js";
import { DisplayComponent } from "../../ui/components/components.js";
import { ComponentStyle } from "../../ui/ComponentStyles.js";
import { EditorContext } from "../Editor/Editor.js";
import { EditorWindow } from "./EditorWindow.js";

export class ListMenuWindow extends EditorWindow {
  constructor() {
    super();

    this.buffer.addLine("first");
    this.buffer.addLine("second");
    this.buffer.addLine("third");
  }

  onEnter(ctx: EditorContext): void {
    const line = this.buffer.at(this.cursor.line);
  }
}
