import { assert } from "../../assert.js";
import { DisplayComponent } from "../components.js";
import { POSITION_ORDER } from "../../constants.js";
import { LayoutDimensions } from "./LayoutDimension.js";

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
      const margin = child.margin();

      const requested = LayoutDimensions.requestHeight(child, parent);

      if (LayoutDimensions.isHeightFlexible(child)) {
        flexible++;
      }

      if (requested) {
        remaining -= requested;
      }

      remaining -= margin.top + margin.bottom;
    }

    remaining = Math.max(0, remaining);

    let y = parent.y;

    // Layout normal children.
    for (const child of children) {
      const margin = child.margin();

      let height: number = LayoutDimensions.requestHeight(child, parent) || 0;

      if (LayoutDimensions.isHeightFlexible(child)) {
        height = flexible > 0 ? Math.floor(remaining / flexible) : 0;
        remaining -= height;
        flexible--;
      }

      let width: number = Math.max(
        LayoutDimensions.requestWidth(child, parent),
        0,
      );

      y += margin.top;

      this.Measure(child, {
        x: parent.x + margin.left,
        y,
        width: width,
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
      const margin = child.margin();

      const width = LayoutDimensions.requestWidth(child, parent);

      if (LayoutDimensions.isWidthFlexible(child)) {
        flexible++;
      } else {
        remaining -= width;
      }

      remaining -= margin.left + margin.right;
    }

    let x = parent.x;

    // Layout normal children
    for (const child of children) {
      const margin = child.margin();

      let width: number = LayoutDimensions.requestWidth(child, parent) || 0;

      if (LayoutDimensions.isWidthFlexible(child)) {
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
