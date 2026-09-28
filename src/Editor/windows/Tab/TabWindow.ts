import { type } from "os";
import { assert } from "../../../assert.js";
import { Canvas } from "../../../ui/canvas.js";
import colors from "../../../ui/colors.js";
import { ComponentBorder } from "../../../ui/components/border.js";
import { DisplayComponent } from "../../../ui/components/components.js";
import { EditorRoot } from "../../Editor/EditorRoot.js";
import { EditorWindow } from "../EditorWindow.js";
import { WindowManager } from "../WindowManager/WindowManager.js";
import { isCodeEditorWindow } from "../../../utils.js";

export interface ETabWindow {}

export class TabWindow extends EditorWindow {
  titles: DisplayComponent = new DisplayComponent();
  private _window: EditorRoot = new EditorRoot();
  displayContent: DisplayComponent = new DisplayComponent();
  management: WindowManager = new WindowManager(this._window);
  constructor() {
    super();
    this.titles
      .setHeight("fit-content")
      .setDirection("horizontal")
      .setBackgroundColor(colors.PINK_BACKGROUND)
      .setBorderStyle("full")
      .setBorderBottom(1);

    this.view().addChildren(this.titles);
    this.view().addChildren(
      this.displayContent
        .setName("tab_editor_window")
        .setBackgroundColor(colors.BLACK_BACKGROUND),
    );
  }

  focusWindow(editor: EditorWindow) {
    const parent = this.displayContent;

    assert(parent, "there is no parent to focus on window");
    assert(parent.children().length <= 1, "cannot have more than 1 children");

    const child = parent.children().at(0);
    if (child) {
      parent.removeChild(parent.children().at(0)!);
    }
    parent.addChildren(editor.view());

    if (this.management.activeWindow()) {
      this.management.unfocus(this.management.activeWindow()!);
    }

    this.management.focus(editor);
  }
  focusable(): boolean {
    return false;
  }
  windowExists(window: EditorWindow): boolean {
    return this.management.has(window);
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
    return this;
  }
}

export class CodeEditorGroup extends TabWindow implements ETabWindow {
  findByPath(path: string) {
    for (const window of this.management.all()) {
      try {
        isCodeEditorWindow(window);
        if (window.document.file.path() === path) {
          return window;
        }
      } catch (err) {}
    }
  }
}
