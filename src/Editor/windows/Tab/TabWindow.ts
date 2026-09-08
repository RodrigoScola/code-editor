import { Canvas } from "../../../ui/canvas.js";
import colors from "../../../ui/colors.js";
import { DisplayComponent } from "../../../ui/components/components.js";
import { EditorWindow } from "../EditorWindow.js";

export class TabWindow extends EditorWindow {
  private windows: TabComponent[] = [];
  readonly titles: DisplayComponent = new DisplayComponent();
  readonly board: DisplayComponent = new DisplayComponent();
  activeTab: TabComponent | undefined;

  constructor() {
    super();
    this.titles.setDirection("horizontal");

    this.board.styles().setBackgroundColor(colors.BRIGHT_GREEN_BACKGROUND);

    this.window.addChildren(this.titles);
    this.window.addChildren(this.board);
  }

  add(compo: TabComponent) {
    this.windows.push(compo);
    this.titles.addChildren(compo.window);

    if (!this.activeTab) {
      this.activeTab = compo;
    }

    return this;
  }
  paint(canvas: Canvas) {

  }
}

export class TabComponent extends EditorWindow {
  title: string = "";

  constructor(title: string) {
    super();
    this.title = title;
  }

  paint(canvas: Canvas) {
    this.window.setMaxWidth(this.title.length);
    super.paint(canvas);
    canvas.drawText(this.window.contentLayout(), this.title);
  }
}
