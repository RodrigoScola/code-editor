import { Canvas } from "../../../ui/canvas.js";
import { EditorWindow } from "../EditorWindow.js";

export class TabWindow extends EditorWindow {
  private windows: TabComponent[] = [];

  add(compo: TabComponent) {
    this.windows.push(compo);
    this.window.addChildren(compo.window);
    return this;
  }
  paint(canvas: Canvas) {}
}

export class TabComponent extends EditorWindow {
  title: string = "";

  constructor(title: string) {
    super();
    this.title = title;
  }

  paint(canvas: Canvas) {
    super.paint(canvas);
    canvas.drawText(this.window.contentLayout(), this.title);
  }
}
