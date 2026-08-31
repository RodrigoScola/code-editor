import { Direction } from "readline";
import { assert } from "../../../assert.js";
import { DisplayComponent } from "../../../ui/components.js";
import { EditorRoot } from "../../Editor/EditorRoot.js";
import { EditorWindow } from "../EditorWindow.js";

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

  focus(window: EditorWindow): EditorWindow | null {
    assert(this.windows.has(window.id), "trying to focus an unmanaged window");
    if (this.active) {
      this.active?.blur();
      this.history.push(this.active.id);
    }
    this.active = window;

    this.active?.focus();
    return this.active;
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
  split(
    window: EditorWindow,
    newWindow: EditorWindow,
    direction: DisplayDirection,
  ) {
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
  private overlaps(a: LayoutBounds, b: LayoutBounds): boolean {
    return a.y < b.y + b.height && a.y + a.height > b.y;
  }
  find<T extends EditorWindow>(type: new (...args: any[]) => T): T | null {
    for (const window of this.windows.values()) {
      if (window instanceof type) {
        return window;
      }
    }

    return null;
  }
  private focusDirection(direction: Directions): EditorWindow | null {
    const current = this.active;

    if (!current) {
      return null;
    }

    const currentBounds = current.window.contentLayout();

    const candidates = [...this.windows.values()]
      .filter((window) => window !== current)
      .filter((window) =>
        this.isInDirection(
          currentBounds,
          window.window.contentLayout(),
          direction,
        ),
      );

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const aScore = this.directionScore(
        currentBounds,
        a.window.contentLayout(),
        direction,
      );

      const bScore = this.directionScore(
        currentBounds,
        b.window.contentLayout(),
        direction,
      );

      return aScore - bScore;
    });

    this.focus(candidates[0]);

    return candidates[0];
  }
  private isInDirection(
    current: LayoutBounds,
    candidate: LayoutBounds,
    direction: Directions,
  ): boolean {
    switch (direction) {
      case "left":
        return candidate.x + candidate.width <= current.x;

      case "right":
        return candidate.x >= current.x + current.width;

      case "up":
        return candidate.y + candidate.height <= current.y;

      case "down":
        return candidate.y >= current.y + current.height;
    }
  }
  private directionScore(
    current: LayoutBounds,
    candidate: LayoutBounds,
    direction: Directions,
  ): number {
    const currentCenterX = current.x + current.width / 2;

    const currentCenterY = current.y + current.height / 2;

    const candidateCenterX = candidate.x + candidate.width / 2;

    const candidateCenterY = candidate.y + candidate.height / 2;

    const dx = candidateCenterX - currentCenterX;

    const dy = candidateCenterY - currentCenterY;

    if (direction === "left" || direction === "right") {
      return Math.abs(dx) + Math.abs(dy) * 2;
    }

    return Math.abs(dy) + Math.abs(dx) * 2;
  }
  focusLeft(): EditorWindow | null {
    return this.focusDirection("left");
  }

  focusRight(): EditorWindow | null {
    return this.focusDirection("right");
  }

  focusUp(): EditorWindow | null {
    return this.focusDirection("up");
  }

  focusDown(): EditorWindow | null {
    return this.focusDirection("down");
  }
}
