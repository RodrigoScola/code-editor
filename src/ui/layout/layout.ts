import { assert } from "../../assert.js";
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

  static Measure(root: Component, layout: LayoutBounds): Component {
    root.setLayout(layout);

    if (root.direction() === "vertical") {
      this.layoutVertical(root);
    } else {
      this.layoutHorizontal(root);
    }

    return root;
  }

  private static visibleChildren(component: Component) {
    return component.children().filter((child) => child.visible());
  }

  private static normalChildren(component: Component) {
    return this.visibleChildren(component).filter(
      (child) => child.positionMode() === "normal",
    );
  }

  private static absoluteChildren(component: Component) {
    return this.visibleChildren(component).filter(
      (child) => child.positionMode() === "absolute",
    );
  }

  private static layoutVertical(component: Component) {
    const parent = component.contentLayout();
    const children = this.normalChildren(component);

    let remaining = parent.height;
    let flexible = 0;

    // Find remaining space
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      if (Number.isFinite(measured.height)) {
        remaining -= measured.height!;
      } else if (Number.isFinite(child.maxHeight())) {
        remaining -= child.maxHeight()!;
      } else {
        flexible++;
      }

      remaining -= margin.top + margin.bottom;
    }

    let y = parent.y;

    // Layout normal children
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      let height: number;

      if (Number.isFinite(measured.height)) {
        height = measured.height!;
      } else if (Number.isFinite(child.maxHeight())) {
        height = child.maxHeight()!;
      } else {
        height = Math.floor(remaining / flexible);
        remaining -= height;
        flexible--;
      }

      y += margin.top;

      this.Measure(child, {
        x: parent.x + margin.left,
        y,
        width: parent.width - margin.left - margin.right,
        height,
      });

      y += height + margin.bottom;
    }

    // Absolute children keep their own layout
    for (const child of this.absoluteChildren(component)) {
      this.Measure(child, child.layout());
    }
  }

  private static layoutHorizontal(component: Component) {
    const parent = component.contentLayout();
    const children = this.normalChildren(component);

    let remaining = parent.width;
    let flexible = 0;

    // Find remaining space
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      if (Number.isFinite(measured.width)) {
        remaining -= measured.width!;
      } else if (Number.isFinite(child.maxWidth())) {
        remaining -= child.maxWidth()!;
      } else {
        flexible++;
      }

      remaining -= margin.left + margin.right;
    }

    let x = parent.x;

    // Layout normal children
    for (const child of children) {
      const measured = child.measure(parent);
      const margin = child.margin();

      let width: number;

      if (Number.isFinite(measured.width)) {
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
}
