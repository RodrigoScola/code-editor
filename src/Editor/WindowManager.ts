import { assert } from "../assert.js";
import { DisplayComponent } from "../ui/components.js";
import { EditorRoot } from "./Editor/EditorRoot.js";
import { EditorWindow } from "./windows/EditorWindow.js";

export class WindowManager {
  private windows = new Map<string, EditorWindow>();
  private active: EditorWindow | null = null;
  root: EditorRoot;
  history: string[];
  constructor(root: EditorRoot) {
    this.root = root;
    this.history = [];
  }

  add(window: EditorWindow) {
    this.windows.set(window.id, window);
    return this;
  }
  remove(window: EditorWindow) {
    this.windows.delete(window.id);
    if (this.active === window) {
      this.active = null;
    }
  }
  all(): EditorWindow[] {
    return [...this.windows.values()];
  }

  focus(window: EditorWindow) {
    assert(this.windows.has(window.id), "trying to focus an unmanaged window");
    if (this.active) {
      this.active?.blur();
      this.history.push(this.active.id);
    }
    this.active = window;

    this.active?.focus();
  }
  activeWindow(): EditorWindow | null {
    return this.active;
  }
  previousWindow<T extends EditorWindow>(
    type?: new (...args: any[]) => T,
  ): T | EditorWindow | null {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const id = this.history[i];
      const window = this.windows.get(id);

      if (!window) {
        continue;
      }

      if (!type || window instanceof type) {
        return window as T;
      }
    }

    return null;
  }

  open() {}
  close() {}
  split(window: EditorWindow, newWindow: EditorWindow, direction: Direction) {
    const parent = window.window.parent();

    assert(parent, "cannot split a window without a parent");

    const index = parent.children().indexOf(window.window);

    assert(index !== -1, "window is not part of its parent");

    const split = new DisplayComponent()
      .addChildren(window.window)
      .addChildren(newWindow.window)
      .setDirection(direction);

    parent.removeChild(window.window);
    parent.addChildAt(split, index);

    this.add(newWindow);
  }
  replace() {}
  find<T extends EditorWindow>(type: new (...args: any[]) => T): T | null {
    for (const window of this.windows.values()) {
      if (window instanceof type) {
        return window;
      }
    }

    return null;
  }
}
