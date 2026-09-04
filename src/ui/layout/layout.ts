import { assert } from "../../assert.js";
import { DisplayComponent } from "../components.js";
import { POSITION_ORDER } from "../../constants.js";

export class LayoutEngine {
  static CreateBounds(): LayoutBounds {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  static Measure(
    root: DisplayComponent,
    layout?: LayoutBounds,
  ): DisplayComponent {
    layout ??= root.contentLayout();

    root.setLayout(layout);

    if (root.direction() === "vertical") {
      this.layoutVertical(root);
    } else {
      this.layoutHorizontal(root);
    }

    return root;
  }

  private static visibleChildren(component: DisplayComponent) {
    return component.children().filter((child) => child.visible());
  }

  private static normalChildren(component: DisplayComponent) {
    return this.visibleChildren(component).filter(
      (child) => child.positionMode() === "normal",
    );
  }

  private static absoluteChildren(component: DisplayComponent) {
    return this.visibleChildren(component).filter(
      (child) => child.positionMode() === "absolute",
    );
  }

  private static layoutVertical(component: DisplayComponent) {
    const parent = component.contentLayout();
    const children = this.normalChildren(component);

    let remaining = parent.height;
    let flexible = 0;

    // Find remaining space.
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      const requestedHeight = this.resolvesize(child.height(), parent.height);

      if (requestedHeight !== null) {
        remaining -= requestedHeight;
      } else if (Number.isFinite(measured.height)) {
        remaining -= measured.height!;
      } else if (child.maxHeight() !== null) {
        remaining -= child.maxHeight()!;
      } else {
        flexible++;
      }

      remaining -= margin.top + margin.bottom;
    }

    remaining = Math.max(0, remaining);

    let y = parent.y;

    // Layout normal children.
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      const requestedHeight = this.resolvesize(child.height(), parent.height);

      let height: number = child.maxHeight() || 0;

      if (requestedHeight !== null) {
        height = requestedHeight;
      } else if (Number.isFinite(measured.height)) {
        height = measured.height!;
      } else {
        if (child.maxHeight() == null) {
          height = flexible > 0 ? Math.floor(remaining / flexible) : 0;

          remaining -= height;
          flexible--;
        }
      }

      if (child.maxHeight() !== null) {
        height = Math.min(height, child.maxHeight()!);
      }

      const requestedWidth = this.resolvesize(child.width(), parent.width);

      let width: number;

      if (requestedWidth !== null) {
        width = requestedWidth;
      } else if (Number.isFinite(measured.width)) {
        width = measured.width!;
      } else {
        width = parent.width - margin.left - margin.right;
      }

      if (child.maxWidth() !== null) {
        width = Math.min(width, child.maxWidth()!);
      }

      y += margin.top;

      this.Measure(child, {
        x: parent.x + margin.left,
        y,
        width: Math.max(0, width),
        height: Math.max(0, height),
      });

      y += height + margin.bottom;
    }

    // Absolute children keep their own layout.
    for (const child of this.absoluteChildren(component)) {
      this.Measure(child, child.layout());
    }
  }

  private static layoutHorizontal(component: DisplayComponent) {
    const parent = component.layout();
    const children = this.normalChildren(component);

    let remaining = parent.width;
    let flexible = 0;

    // Find remaining space
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      const requestedWidth = this.resolvesize(child.width(), parent.width);

      if (requestedWidth) {
        remaining -= requestedWidth;
      } else {
        if (Number.isFinite(measured.width)) {
          remaining -= measured.width!;
        } else if (Number.isFinite(child.maxWidth())) {
          remaining -= child.maxWidth()!;
        } else {
          flexible++;
        }
      }

      remaining -= margin.left + margin.right;
    }

    let x = parent.x;

    // Layout normal children
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      const requestedWidth = this.resolvesize(child.width(), parent.width);

      let width: number;

      if (requestedWidth) {
        width = requestedWidth;
      } else if (Number.isFinite(measured.width)) {
        width = measured.width!;
      } else if (Number.isFinite(child.maxWidth())) {
        width = child.maxWidth()!;
      } else {
        width = Math.floor(remaining / flexible);
        remaining -= width;
        flexible--;
      }

      x += margin.left;

      this.Measure(child, {
        x,
        y: parent.y + margin.top,
        width,
        height: parent.height - margin.top - margin.bottom,
      });

      x += width + margin.right;
    }

    assert(
      remaining === 0,
      `not using all remaining. expected: 0, got ${remaining}`,
    );

    // Absolute children keep their own layout
    for (const child of this.absoluteChildren(component)) {
      this.Measure(child, child.layout());
    }
  }
  static resolvesize(size: Size, available: number) {
    if (size === "auto") {
      return null;
    }
    if (typeof size === "number") {
      return size;
    }
    if (size.endsWith("%")) {
      const percentage = Number.parseFloat(size);
      if (!Number.isFinite(percentage)) {
        return null;
      }
      const out = Math.floor((available * percentage) / 100);
      return out;
    }
    return null;
  }
}
