import { type } from "os";
import { assert } from "../../../assert.js";
import { Canvas } from "../../../ui/canvas.js";
import colors from "../../../ui/colors.js";
import { ComponentBorder } from "../../../ui/display/border.js";
import { DisplayComponent } from "../../../ui/components/displayComponent.js";
import { EditorRoot } from "../../Editor/EditorRoot.js";
import { UiComponent, UIScreen } from "../../../ui/components/UiComponent.js";
import { WindowManager } from "../WindowManager/WindowManager.js";
import { isCodeEditorWindow } from "../../../utils.js";

export interface ETabWindow {}

export class TabWindow extends UIScreen {
  titles: DisplayComponent = new DisplayComponent();
  private _window: EditorRoot = new EditorRoot();
  displayContent: UiComponent = new UiComponent();
  management: WindowManager = new WindowManager(this._window);
  constructor() {
    super();

    this.setCursorEnabled(false);

    this.titles
      .setHeight("fit-content")
      .setDirection("horizontal")
      .setBackgroundColor(colors.PINK_BACKGROUND)
      .setBorderStyle("full")
      .setBorderBottom(1);

    this.view().addChildren(this.titles);
    this.displayContent
      .view()
      .setName("tab_editor_window")
      .setBackgroundColor(colors.BLACK_BACKGROUND);
    this.addChildren(this.displayContent);
  }

  focusWindow(editor: UiComponent) {
    const parent = this.displayContent;

    assert(parent, "there is no parent to focus on window");
    assert(parent.children().length <= 1, "cannot have more than 1 children");

    const child = parent.children().at(0);
    if (child) {
      parent.removeChild(parent.children().at(0)!);
    }
    parent.addChildren(editor);

    if (this.management.activeWindow()) {
      this.management.deactivate(this.management.activeWindow()!);
    }

    this.management.activate(editor);
  }
  focusable(): boolean {
    return false;
  }
  windowExists(window: UiComponent): boolean {
    return this.management.has(window);
  }

  add(title: string, window: UiComponent) {
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
