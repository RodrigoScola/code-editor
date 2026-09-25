import { assert } from "../../../assert.js";
import { Canvas } from "../../../ui/canvas.js";
import colors from "../../../ui/colors.js";
import { ComponentBorder } from "../../../ui/components/border.js";
import { DisplayComponent } from "../../../ui/components/components.js";
import { EditorRoot } from "../../Editor/EditorRoot.js";
import { EditorWindow } from "../EditorWindow.js";
import { WindowManager } from "../WindowManager/WindowManager.js";

export class TabWindow extends EditorWindow {
  titles: DisplayComponent = new DisplayComponent();
  private _window: EditorRoot = new EditorRoot();
  displayContent: DisplayComponent = new DisplayComponent();
  management: WindowManager = new WindowManager(this._window);
  constructor() {
    super();
    this.titles.setHeight("fit-content");
    this.titles.styles().setBackgroundColor(colors.PINK_BACKGROUND);
    this.titles.border().setBorderSyle("full").setBottom(1);
    this.displayContent.styles().setBackgroundColor(colors.BLACK_BACKGROUND);

    this.window.addChildren(this.titles);
    this.window.addChildren(this.displayContent);
  }

  focusWindow(editor: EditorWindow) {
    const parent = this.displayContent.parent();
    assert(parent, "there is no parent to focus on window");

    const index = parent.children().indexOf(this.displayContent);
    parent.removeChild(this.displayContent);
    parent.addChildAt(editor.window, index);
    this.management.focus(editor);
  }

  add(title: string, window: EditorWindow) {
    const component = new DisplayComponent();
    component
      .setHeight("fit-content")
      .setWidth("fit-content")

      .setBorder(new ComponentBorder().setParameter(1).setBorderSyle("double"))
      .setName(title)
      .setContent(title);

    component.styles().setBackgroundColor(colors.BRIGHT_RED_BACKGROUND);

    this.titles.addChildren(component);

    this.management.add(window);

    if (!this.management.activeWindow()) {
      this.focusWindow(window);
    }
  }
}
